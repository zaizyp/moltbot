/**
 * 企业微信相关类型定义
 */

export interface WeComBotConfig {
  corpId: string;
  secret: string;
  agentId: number;
  webhookUrl?: string;
  token?: string;
  encodingAESKey?: string;
  webhookPath?: string;
  port?: number;
  replyToMode?: "off" | "first" | "all";
  groupPolicy?: "blocked" | "allowed" | "unmentioned" | "open";
  groupAllowFrom?: string[];
  allowFrom?: string[];
  mediaMaxMb?: number;
  timeoutSeconds?: number;
  proxy?: string;
}

export interface WeComAccount {
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

export interface WeComMessageEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: "text" | "image" | "voice" | "video" | "file" | "event";
  MsgId?: string;
  AgentID: number;
  Content?: string;
  MediaId?: string;
  Title?: string;
  Description?: string;
  FileExt?: string;
  Recognition?: string;
  Url?: string;
  Event?: "subscribe" | "unsubscribe" | "enter_agent" | "location" | "click";
  EventKey?: string;
  Latitude?: number;
  Longitude?: number;
  Precision?: number;
  unrecognized?: string;
}

export interface WeComWebhookPayload {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  MsgId?: string;
  AgentID: number;
  Content?: string;
  Event?: string;
  [key: string]: unknown;
}

export interface WeComTextMessage {
  touser?: string;
  toparty?: string;
  totag?: string;
  msgtype: "text" | "markdown" | "image" | "file" | "voice" | "video" | "news" | "mpnews" | "textcard";
  text?: { content: string };
  markdown?: { content: string };
  image?: { media_id: string };
  file?: { media_id: string };
  voice?: { media_id: string };
  video?: { media_id: string; title?: string; description?: string };
  news?: { articles: Array<{ title: string; description: string; url: string; picurl: string }> };
  mpnews?: { media_id: string };
  textcard?: { title: string; description: string; url: string; btntxt?: string };
  safe?: 0 | 1;
  enable_id_trans?: 0 | 1;
  enable_duplicate_check?: 0 | 1;
  duplicate_check_interval?: number;
}

export interface WeComApiResponse<T = unknown> {
  errcode: number;
  errmsg: string;
  [key: string]: T;
}

export interface WeComAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface WeComMediaUploadResponse {
  type: string;
  media_id: string;
  created_at: string;
}

export interface WeComTextCard {
  title: string;
  description: string;
  url: string;
  btntxt?: string;
}

export interface WeComMonitorOptions {
  runtime?: {
    log: (msg: string) => void;
    error: (msg: string) => void;
  };
  onMessage?: (event: WeComMessageEvent) => Promise<void>;
  onTextMessage?: (params: { userId: string; content: string; msgId: string }) => Promise<void>;
  onMediaMessage?: (params: {
    userId: string;
    msgId: string;
    mediaId: string;
    mediaType: string;
  }) => Promise<void>;
  config?: WeComBotConfig;
}
