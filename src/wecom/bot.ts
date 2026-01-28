/**
 * 企业微信 Bot
 * 主要的机器人创建和配置逻辑
 */

import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { isControlCommandMessage } from "../auto-reply/command-detection.js";
import { resolveTextChunkLimit } from "../auto-reply/chunk.js";
import { DEFAULT_GROUP_HISTORY_LIMIT, type HistoryEntry } from "../auto-reply/reply/history.js";
import { resolveNativeCommandsEnabled, resolveNativeSkillsEnabled } from "../config/commands.js";
import type { MoltbotConfig, ReplyToMode } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import { loadSessionStore, resolveStorePath } from "../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../globals.js";
import { getChildLogger } from "../logging.js";
import { resolveAgentRoute } from "../routing/resolve-route.js";
import type { RuntimeEnv } from "../runtime.js";
import { WeComApiClient } from "./api.js";
import { resolveWeComAccount } from "./accounts.js";
import type { WeComMessageEvent } from "./types.js";
import type { MsgContext } from "../auto-reply/templating.js";
import { createWeComWebhookServer } from "./client.js";
import { monitorWeComProvider, stopWeComMonitor, type WeComMonitorState } from "./monitor.js";
import { parseWeComTarget } from "./targets.js";

export interface WeComBotOptions {
  accountId?: string;
  runtime?: RuntimeEnv;
  requireMention?: boolean;
  allowFrom?: string[];
  groupAllowFrom?: string[];
  mediaMaxMb?: number;
  replyToMode?: ReplyToMode;
  config?: MoltbotConfig;
}

export interface WeComBotState {
  monitorState?: WeComMonitorState;
  apiClient?: WeComApiClient;
  accountId: string;
  config: WeComBotOptions["config"];
}

export type WeComContext = MsgContext & {
  To?: string;
  From?: string;
  ChatType?: "direct" | "group";
  ReplyToId?: string;
  MessageId?: string;
  MessageThreadId?: string;
  AgentId?: number;
  MediaId?: string;
};

/**
 * 创建企业微信机器人
 */
export function createWeComBot(opts: WeComBotOptions): WeComBotState {
  const runtime: RuntimeEnv = opts.runtime ?? {
    log: console.log,
    error: console.error,
  };
  const cfg = opts.config ?? loadConfig();
  const account = resolveWeComAccount({ cfg, accountId: opts.accountId });

  const state: WeComBotState = {
    accountId: account.accountId,
    config: cfg,
  };

  // 创建 API 客户端
  state.apiClient = new WeComApiClient({
    corpId: account.corpId,
    secret: account.secret,
    agentId: account.agentId,
  });

  return state;
}

/**
 * 启动企业微信机器人
 */
export async function startWeComBot(
  state: WeComBotState,
  opts: WeComBotOptions,
): Promise<void> {
  const cfg = state.config ?? loadConfig();
  const account = resolveWeComAccount({ cfg, accountId: state.accountId });

  // 创建监控选项
  const monitorOpts = {
    runtime: opts.runtime,
    config: account.config,
    onMessage: async (event: WeComMessageEvent) => {
      await handleWeComMessage(state, event, opts);
    },
  };

  // 启动监控
  state.monitorState = await monitorWeComProvider(monitorOpts);
}

/**
 * 停止企业微信机器人
 */
export async function stopWeComBot(state: WeComBotState): Promise<void> {
  if (state.monitorState) {
    await stopWeComMonitor(state.monitorState);
  }
}

/**
 * 处理企业微信消息
 */
async function handleWeComMessage(
  state: WeComBotState,
  event: WeComMessageEvent,
  opts: WeComBotOptions,
): Promise<void> {
  const cfg = state.config;
  const logger = getChildLogger();

  // 构建上下文
  const ctx: WeComContext = {
    Channel: "wecom",
    To: event.ToUserName,
    From: event.FromUserName,
    MessageId: event.MsgId,
    AgentId: event.AgentID,
    MediaId: event.MediaId,
  };

  // 确定聊天类型
  // 企业微信用户ID格式通常是：USERID（个人）或 PartyID（部门）
  const isGroup = event.FromUserName.includes("Party") || event.FromUserName.startsWith("party:");
  ctx.ChatType = isGroup ? "group" : "direct";

  logVerbose(`WeCom message: From=${event.FromUserName}, Type=${event.MsgType}, IsGroup=${isGroup}`);

  // 根据消息类型处理
  switch (event.MsgType) {
    case "text":
      if (event.Content) {
        // 检查是否是控制命令
        const isCommand = isControlCommandMessage(event.Content);
        if (isCommand) {
          logVerbose(`WeCom: Detected control command from ${event.FromUserName}`);
          // TODO: 处理控制命令
        }

        // TODO: 调用 AI 响应
        await handleTextMessage(state, ctx, event.Content, opts);
      }
      break;

    case "image":
    case "voice":
    case "video":
    case "file":
      if (event.MediaId) {
        await handleMediaMessage(state, ctx, event.MsgType, event.MediaId, opts);
      }
      break;

    case "event":
      await handleEventMessage(state, ctx, event);
      break;

    default:
      logVerbose(`WeCom: Unhandled message type: ${event.MsgType}`);
  }
}

/**
 * 处理文本消息
 */
async function handleTextMessage(
  state: WeComBotState,
  ctx: WeComContext,
  content: string,
  opts: WeComBotOptions,
): Promise<void> {
  const cfg = state.config;
  const account = resolveWeComAccount({ cfg, accountId: state.accountId });

  // 检查权限
  if (ctx.ChatType === "group") {
    const groupPolicy = account.config.groupPolicy ?? "blocked";
    if (groupPolicy === "blocked") {
      logVerbose(`WeCom: Group messages blocked for ${ctx.From}`);
      return;
    }

    if (groupPolicy === "allowed") {
      const allowed = account.config.groupAllowFrom ?? [];
      if (!allowed.includes(ctx.From)) {
        logVerbose(`WeCom: Group ${ctx.From} not in allowlist`);
        return;
      }
    }
  } else {
    // 检查私信权限
    const allowFrom = opts.allowFrom ?? account.config.allowFrom ?? [];
    if (allowFrom.length > 0 && !allowFrom.includes(ctx.From)) {
      logVerbose(`WeCom: User ${ctx.From} not in allowlist`);
      return;
    }
  }

  // TODO: 解析并路由到 AI Agent
  logVerbose(`WeCom: Processing text from ${ctx.From}: ${content.slice(0, 50)}...`);
}

/**
 * 处理媒体消息
 */
async function handleMediaMessage(
  state: WeComBotState,
  ctx: WeComContext,
  mediaType: string,
  mediaId: string,
  opts: WeComBotOptions,
): Promise<void> {
  logVerbose(`WeCom: Processing ${mediaType} media: ${mediaId}`);
  // TODO: 下载媒体文件并处理
}

/**
 * 处理事件消息
 */
async function handleEventMessage(state: WeComBotState, ctx: WeComContext, event: WeComMessageEvent): Promise<void> {
  logVerbose(`WeCom: Event ${event.Event} from ${ctx.From}`);
  // TODO: 处理各种事件
}
