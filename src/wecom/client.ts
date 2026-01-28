/**
 * 企业微信 Webhook 客户端
 * 使用 Fastify 创建 webhook 服务器
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import * as fastify from "fastify";
import { loadConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import type { WeComMonitorOptions } from "./types.js";
import { resolveWeComAccount } from "./accounts.js";
import { WeComCrypto } from "./crypto.js";
import type { WeComMessageEvent, WeComWebhookPayload } from "./types.js";

export interface WeComWebhookServerOptions {
  port?: number;
  host?: string;
}

/**
 * 创建企业微信 Webhook 服务器
 */
export async function createWeComWebhookServer(
  opts: WeComMonitorOptions,
  serverOpts: WeComWebhookServerOptions = {},
): Promise<fastify.FastifyInstance> {
  const cfg = loadConfig();
  const account = resolveWeComAccount({
    cfg,
    accountId: opts.config?.webhookPath ? opts.config.webhookPath.split("/")[2] : undefined,
  });

  const webhookPath = opts.config?.webhookPath ?? account.webhookPath ?? "/wecom/webhook";
  const port = serverOpts.port ?? account.port ?? 3000;
  const host = serverOpts.host ?? "0.0.0.0";

  if (!account.token || !account.encodingAESKey) {
    throw new Error(
      "WeCom token and encodingAESKey are required for webhook mode. Set channels.wecom.accounts.${accountId}.token and encodingAESKey.",
    );
  }

  const crypto = new WeComCrypto({
    token: account.token,
    encodingAESKey: account.encodingAESKey,
    corpId: account.corpId,
  });

  const server = fastify.default({
    logger: false,
    bodyLimit: 10 * 1024 * 1024, // 10MB
  });

  // 验证 URL（首次配置时）
  server.get<{ Querystring: { msg_signature: string; timestamp: number; nonce: string; echostr: string } }>(
    webhookPath,
    async (request, reply) => {
      try {
        const { msg_signature, timestamp, nonce, echostr } = request.query;

        logVerbose(`WeCom webhook verification: timestamp=${timestamp}, nonce=${nonce}`);

        const decrypted = crypto.verifyUrl(msg_signature, timestamp, nonce, echostr);

        reply.type("text/plain").send(decrypted);
      } catch (error) {
        opts.runtime?.error?.(`WeCom webhook verification failed: ${error}`);
        reply.code(400).send("Verification failed");
      }
    },
  );

  // 接收消息
  server.post<{ Querystring: { msg_signature: string; timestamp: number; nonce: string } }>(
    webhookPath,
    async (request, reply) => {
      try {
        const { msg_signature, timestamp, nonce } = request.query;
        const body = request.body as { Encrypt?: string };

        if (!body?.Encrypt) {
          throw new Error("Missing Encrypt field in request body");
        }

        logVerbose(`WeCom webhook message received: timestamp=${timestamp}`);

        // 验证签名并解密
        const decrypted = crypto.decrypt(body.Encrypt);
        const payload = JSON.parse(decrypted) as WeComMessageEvent;

        logVerbose(
          `WeCom message: From=${payload.FromUserName}, MsgType=${payload.MsgType}, MsgId=${payload.MsgId}`,
        );

        // 处理消息
        await handleMessage(opts, payload);

        reply.type("text/plain").send("success");
      } catch (error) {
        opts.runtime?.error?.(`WeCom webhook message handling failed: ${error}`);
        reply.code(500).send("Internal error");
      }
    },
  );

  // 健康检查
  server.get("/health", async (request, reply) => {
    reply.send({ status: "ok", service: "wecom-webhook" });
  });

  await server.listen({ port, host });
  opts.runtime?.log?.(`WeCom webhook server listening on http://${host}:${port}${webhookPath}`);

  return server;
}

/**
 * 处理接收到的消息
 */
async function handleMessage(
  opts: WeComMonitorOptions,
  event: WeComMessageEvent,
): Promise<void> {
  // 通用消息处理
  if (opts.onMessage) {
    await opts.onMessage(event);
  }

  // 根据消息类型分发
  switch (event.MsgType) {
    case "text":
      if (opts.onTextMessage && event.Content) {
        await opts.onTextMessage({
          userId: event.FromUserName,
          content: event.Content,
          msgId: event.MsgId ?? "",
        });
      }
      break;

    case "image":
    case "voice":
    case "video":
    case "file":
      if (opts.onMediaMessage && event.MediaId) {
        await opts.onMediaMessage({
          userId: event.FromUserName,
          msgId: event.MsgId ?? "",
          mediaId: event.MediaId,
          mediaType: event.MsgType,
        });
      }
      break;

    case "event":
      // 处理事件消息（订阅、取消订阅等）
      logVerbose(`WeCom event: ${event.Event}, EventKey: ${event.EventKey}`);
      break;

    default:
      logVerbose(`WeCom unhandled message type: ${event.MsgType}`);
  }
}
