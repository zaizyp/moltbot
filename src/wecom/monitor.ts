/**
 * 企业微信 Monitor
 * 负责启动 Webhook 服务器并处理消息
 */

import { enqueueSystemEvent } from "../infra/system-events.js";
import { logVerbose } from "../globals.js";
import type { WeComMonitorOptions } from "./types.js";
import { createWeComWebhookServer } from "./client.js";

export interface WeComMonitorState {
  server?: Awaited<ReturnType<typeof createWeComWebhookServer>>;
  startedAt?: number;
}

/**
 * 启动企业微信监控
 */
export async function monitorWeComProvider(
  opts: WeComMonitorOptions,
): Promise<WeComMonitorState> {
  const { runtime } = opts;

  logVerbose("Starting WeCom monitor...");

  const state: WeComMonitorState = {
    startedAt: Date.now(),
  };

  try {
    // 创建并启动 Webhook 服务器
    const server = await createWeComWebhookServer(opts);
    state.server = server;

    logVerbose(`WeCom monitor started on port ${server.server.address()}`);

    enqueueSystemEvent({
      channel: "wecom",
      level: "info",
      message: "WeCom monitor started",
    });

    return state;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    runtime?.error?.(`WeCom monitor failed to start: ${errorMessage}`);

    enqueueSystemEvent({
      channel: "wecom",
      level: "error",
      message: `WeCom monitor failed to start: ${errorMessage}`,
    });

    throw error;
  }
}

/**
 * 停止企业微信监控
 */
export async function stopWeComMonitor(state: WeComMonitorState): Promise<void> {
  if (state.server) {
    logVerbose("Stopping WeCom monitor...");
    await state.server.close();
    logVerbose("WeCom monitor stopped");
  }
}

/**
 * 创建默认的监控选项
 */
export function createWeComMonitorOptions(
  overrides?: Partial<WeComMonitorOptions>,
): WeComMonitorOptions {
  return {
    runtime: {
      log: (msg: string) => logVerbose(`WeCom: ${msg}`),
      error: (msg: string) => logVerbose(`WeCom ERROR: ${msg}`),
    },
    ...overrides,
  };
}
