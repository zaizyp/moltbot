/**
 * 企业微信账户配置
 */

import type { MoltbotConfig } from "../config/config.js";
import type { WeComAccount, WeComBotConfig } from "./types.js";

export type WeComTokenSource = "config" | "env" | "file";

export interface ResolvedWeComAccount {
  accountId: string;
  corpId: string;
  secret: string;
  agentId: number;
  webhookUrl?: string;
  token?: string;
  encodingAESKey?: string;
  webhookPath?: string;
  port?: number;
  config: WeComBotConfig;
  tokenSource?: string;
  secretSource?: string;
  enabled?: boolean;
}

export function resolveWeComAccount(params: {
  cfg: MoltbotConfig;
  accountId?: string | null;
}): ResolvedWeComAccount {
  const { cfg, accountId } = params;
  const wecomConfig = cfg.channels?.wecom as
    | {
        accounts?: Record<string, WeComBotConfig>;
        defaultAccountId?: string;
      }
    | undefined;

  const normalizedAccountId = accountId ?? wecomConfig?.defaultAccountId ?? "default";
  const accountConfig = wecomConfig?.accounts?.[normalizedAccountId];

  if (!accountConfig) {
    throw new Error(
      `WeCom account not found: ${normalizedAccountId}. Please configure channels.wecom.accounts.${normalizedAccountId}`,
    );
  }

  const corpId = accountConfig.corpId || process.env.WECOM_CORPID;
  const secret = accountConfig.secret || process.env.WECOM_SECRET;
  const agentId = accountConfig.agentId;

  if (!corpId) {
    throw new Error(
      `WeCom corpId not configured. Set channels.wecom.accounts.${normalizedAccountId}.corpId or WECOM_CORPID environment variable.`,
    );
  }

  if (!secret) {
    throw new Error(
      `WeCom secret not configured. Set channels.wecom.accounts.${normalizedAccountId}.secret or WECOM_SECRET environment variable.`,
    );
  }

  if (typeof agentId !== "number" || agentId <= 0) {
    throw new Error(
      `WeCom agentId must be a positive number. Set channels.wecom.accounts.${normalizedAccountId}.agentId`,
    );
  }

  return {
    accountId: normalizedAccountId,
    corpId,
    secret,
    agentId,
    webhookUrl: accountConfig.webhookUrl,
    token: accountConfig.token,
    encodingAESKey: accountConfig.encodingAESKey,
    webhookPath: accountConfig.webhookPath ?? "/wecom/webhook",
    port: accountConfig.port ?? 3000,
    config: accountConfig,
    tokenSource: corpId === process.env.WECOM_CORPID ? "env" : "config",
    secretSource: secret === process.env.WECOM_SECRET ? "env" : "config",
    enabled: accountConfig.enabled ?? true,
  };
}

export function resolveWeComAccountOrThrow(params: {
  cfg: MoltbotConfig;
  accountId?: string | null;
}): ResolvedWeComAccount {
  try {
    return resolveWeComAccount(params);
  } catch (error) {
    throw new Error(`Failed to resolve WeCom account: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function resolveWeCorpId(account: ResolvedWeComAccount | WeComAccount): string {
  return account.corpId;
}

export function resolveWeComSecret(account: ResolvedWeComAccount | WeComAccount): string {
  return account.secret;
}

export function resolveWeComAgentId(account: ResolvedWeComAccount | WeComAccount): number {
  return account.agentId;
}

export function resolveWeComToken(account: ResolvedWeComAccount | WeComAccount): string | undefined {
  return account.token;
}

export function resolveWeComEncodingAESKey(
  account: ResolvedWeComAccount | WeComAccount,
): string | undefined {
  return account.encodingAESKey;
}

export function resolveWeComWebhookUrl(account: ResolvedWeComAccount | WeComAccount): string | undefined {
  return account.webhookUrl;
}

export function resolveWeComWebhookPath(account: ResolvedWeComAccount | WeComAccount): string {
  return account.webhookPath ?? "/wecom/webhook";
}

export function resolveWeComPort(account: ResolvedWeComAccount | WeComAccount): number {
  return account.port ?? 3000;
}
