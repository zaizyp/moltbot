/**
 * 企业微信发送消息
 */

import {
  chunkMarkdownTextWithMode,
  resolveChunkMode,
  resolveTextChunkLimit,
} from "../auto-reply/chunk.js";
import { loadConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import { loadWebMedia } from "../web/media.js";
import { resolveWeComAccount } from "./accounts.js";
import { WeComApiClient } from "./api.js";
import { markdownToWeComMarkdown, truncateWeComMessage } from "./format.js";
import { parseWeComTarget } from "./targets.js";
import type { ResolvedWeComAccount } from "./accounts.js";

const WECOM_TEXT_LIMIT = 4096;
const WECOM_MARKDOWN_LIMIT = 4096;

export interface WeComSendOptions {
  accountId?: string;
  mediaUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface WeComSendResult {
  messageId?: string;
  target: string;
}

/**
 * 发送文本消息
 */
async function sendTextMessage(
  api: WeComApiClient,
  target: string,
  content: string,
): Promise<void> {
  await api.sendText(target, content);
}

/**
 * 发送 Markdown 消息
 */
async function sendMarkdownMessage(
  api: WeComApiClient,
  target: string,
  markdown: string,
): Promise<void> {
  await api.sendMarkdown(target, markdown);
}

/**
 * 发送消息到企业微信
 */
export async function sendMessageWeCom(
  to: string,
  message: string,
  opts: WeComSendOptions = {},
): Promise<WeComSendResult> {
  const trimmedMessage = message?.trim() ?? "";
  if (!trimmedMessage && !opts.mediaUrl) {
    throw new Error("WeCom send requires text or media");
  }

  const cfg = loadConfig();
  const account = resolveWeComAccount({
    cfg,
    accountId: opts.accountId,
  });

  const target = parseWeComTarget(to);
  if (!target) {
    throw new Error("Invalid WeCom target");
  }

  const api = new WeComApiClient({
    corpId: account.corpId,
    secret: account.secret,
    agentId: account.agentId,
    fetch: opts.fetch,
  });

  const textLimit = resolveTextChunkLimit(cfg, "wecom", account.accountId);
  const chunkLimit = Math.min(textLimit, WECOM_TEXT_LIMIT);
  const chunkMode = resolveChunkMode(cfg, "wecom", account.accountId);

  // 上传媒体文件
  let mediaId: string | undefined;
  if (opts.mediaUrl) {
    const mediaMaxBytes =
      typeof account.config.mediaMaxMb === "number"
        ? account.config.mediaMaxMb * 1024 * 1024
        : undefined;

    const { buffer, contentType, fileName } = await loadWebMedia(opts.mediaUrl, mediaMaxBytes);

    // 根据内容类型确定媒体类型
    let mediaType: "image" | "voice" | "video" | "file";
    if (contentType?.startsWith("image/")) {
      mediaType = "image";
    } else if (contentType?.startsWith("audio/")) {
      mediaType = "voice";
    } else if (contentType?.startsWith("video/")) {
      mediaType = "video";
    } else {
      mediaType = "file";
    }

    mediaId = await api.uploadMedia(mediaType, buffer, fileName);
  }

  // 处理文本/Markdown 内容
  const chunks =
    chunkMode === "newline"
      ? chunkMarkdownTextWithMode(trimmedMessage, chunkLimit, chunkMode)
      : [trimmedMessage];

  // 发送第一条消息（如果有媒体，则作为媒体消息的说明）
  if (mediaId) {
    const [firstChunk, ...rest] = chunks;

    // 发送媒体消息
    if (opts.mediaUrl) {
      const mediaType = await detectMediaType(opts.mediaUrl, opts.fetch);
      switch (mediaType) {
        case "image":
          await api.sendImage(target.id, mediaId);
          break;
        case "video":
          await api.sendFile(target.id, mediaId);
          break;
        default:
          await api.sendFile(target.id, mediaId);
      }
    }

    // 发送说明文本
    if (firstChunk) {
      await sendTextMessage(api, target.id, firstChunk);
    }

    // 发送剩余文本块
    for (const chunk of rest) {
      await sendTextMessage(api, target.id, chunk);
    }
  } else {
    // 纯文本/Markdown 消息
    for (const chunk of chunks.length ? chunks : [""]) {
      const truncated = truncateWeComMessage(chunk, WECOM_TEXT_LIMIT);
      const markdown = markdownToWeComMarkdown(truncated);
      await sendMarkdownMessage(api, target.id, markdown);
    }
  }

  return {
    messageId: undefined, // 企业微信不返回消息ID
    target: target.id,
  };
}

/**
 * 检测媒体类型
 */
async function detectMediaType(
  url: string,
  fetch?: typeof globalThis.fetch,
): Promise<"image" | "video" | "file"> {
  try {
    const fetchImpl = fetch ?? globalThis.fetch;
    const response = await fetchImpl(url, { method: "HEAD" });
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.startsWith("image/")) {
      return "image";
    } else if (contentType.startsWith("video/")) {
      return "video";
    }
  } catch (error) {
    logVerbose(`Failed to detect media type for ${url}: ${error}`);
  }

  return "file";
}
