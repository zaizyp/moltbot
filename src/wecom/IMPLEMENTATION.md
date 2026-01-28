# 企业微信通道实现说明

## 架构概述

企业微信通道采用 Webhook 回调方式接收消息，通过企业微信 API 发送消息。

### 目录结构

```
src/wecom/
├── accounts.ts       # 账户配置解析
├── api.ts            # 企业微信 API 客户端
├── bot.ts            # 机器人核心逻辑
├── client.ts         # Webhook 客户端
├── crypto.ts         # 消息加解密
├── format.ts         # 消息格式化
├── index.ts          # 导出接口
├── monitor.ts        # 消息监控
├── send.ts           # 消息发送
├── targets.ts        # 目标解析
├── types.ts          # 类型定义
└── README.md         # 配置文档
```

## 核心组件

### 1. API 客户端 (api.ts)

负责与企业微信 API 交互：

- **获取 Access Token**: 自动管理 Token 有效期，过期自动刷新
- **发送消息**: 支持文本、Markdown、图片、文件等类型
- **媒体上传/下载**: 上传临时素材，获取媒体文件

```typescript
class WeComApiClient {
  getAccessToken(): Promise<string>
  sendText(userId: string, content: string): Promise<void>
  sendMarkdown(userId: string, content: string): Promise<void>
  uploadMedia(type, file, filename): Promise<string>
  getMedia(mediaId: string): Promise<Blob>
}
```

### 2. Webhook 客户端 (client.ts)

使用 Fastify 创建 Webhook 服务器：

- **URL 验证**: 处理首次配置时的 URL 验证请求
- **消息接收**: 接收并解密企业微信推送的消息
- **消息分发**: 根据消息类型分发到对应处理函数

```typescript
async function createWeComWebhookServer(opts, serverOpts): Promise<FastifyInstance>
```

### 3. 加密模块 (crypto.ts)

实现企业微信消息的加解密：

- **AES-256-CBC 加密**: 企业微信要求使用该算法加密消息
- **PKCS7 填充**: 实现块加密的填充方案
- **签名验证**: 验证 Webhook 请求的签名

```typescript
class WeComCrypto {
  verifySignature(signature, timestamp, nonce, echostr): boolean
  decrypt(encryptedMsg): string
  encrypt(msg): string
  verifyUrl(signature, timestamp, nonce, echostr): string
}
```

### 4. 消息发送 (send.ts)

处理消息发送逻辑：

- **消息分块**: 根据企业微信消息长度限制自动分块
- **Markdown 转换**: 将标准 Markdown 转换为企业微信支持的格式
- **媒体处理**: 上传媒体文件并发送

```typescript
async function sendMessageWeCom(to: string, message: string, opts): Promise<WeComSendResult>
```

### 5. 机器人核心 (bot.ts)

机器人创建和消息处理：

- **启动/停止**: 管理机器人生命周期
- **消息路由**: 根据消息类型和内容路由到对应的处理逻辑
- **权限检查**: 实现私信和群组消息的权限控制

```typescript
function createWeComBot(opts: WeComBotOptions): WeComBotState
async function startWeComBot(state, opts): Promise<void>
async function stopWeComBot(state): Promise<void>
```

### 6. 监控器 (monitor.ts)

监控 Webhook 服务器状态：

```typescript
async function monitorWeComProvider(opts): Promise<WeComMonitorState>
async function stopWeComMonitor(state): Promise<void>
```

## 集成到 Moltbot

### 1. 通道注册 (channels/registry.ts)

在 `CHAT_CHANNEL_ORDER` 中添加 `wecom`：

```typescript
export const CHAT_CHANNEL_ORDER = [
  "telegram",
  "whatsapp",
  "discord",
  "googlechat",
  "slack",
  "signal",
  "imessage",
  "wecom",  // 添加企业微信
] as const;
```

添加通道元数据：

```typescript
const CHAT_CHANNEL_META: Record<ChatChannelId, ChannelMeta> = {
  // ... 其他通道
  wecom: {
    id: "wecom",
    label: "WeCom",
    selectionLabel: "WeCom (Enterprise WeChat)",
    detailLabel: "WeCom",
    docsPath: "/channels/wecom",
    docsLabel: "wecom",
    blurb: "enterprise WeChat intelligent robot with webhook support.",
    systemImage: "building.2",
  },
};
```

### 2. 通道 Dock (channels/dock.ts)

在 `DOCKS` 中添加企业微信的 dock 配置：

```typescript
wecom: {
  id: "wecom",
  capabilities: {
    chatTypes: ["direct", "group"],
    media: true,
    blockStreaming: true,
  },
  outbound: { textChunkLimit: 4096 },
  config: {
    resolveAllowFrom: ({ cfg, accountId }) => { /* ... */ },
    formatAllowFrom: ({ allowFrom }) => { /* ... */ },
  },
  groups: {
    resolveRequireMention: resolveWeComGroupRequireMention,
    resolveToolPolicy: resolveWeComGroupToolPolicy,
  },
  threading: {
    resolveReplyToMode: ({ cfg }) => cfg.channels?.wecom?.replyToMode ?? "off",
    buildToolContext: ({ context, hasRepliedRef }) => { /* ... */ },
  },
},
```

### 3. 配置 Schema (config/zod-schema.providers.ts)

添加企业微信配置 schema：

```typescript
export const WeComConfigSchema = z.object({
  corpId: z.string().optional(),
  secret: z.string().optional(),
  agentId: z.number().int().positive().optional(),
  token: z.string().optional(),
  encodingAESKey: z.string().optional(),
  // ... 其他配置项
});
```

在 `ChannelsSchema` 中注册：

```typescript
export const ChannelsSchema = z.object({
  // ... 其他通道
  wecom: WeComConfigSchema.optional(),
});
```

### 4. 群组权限处理 (channels/plugins/group-mentions.ts)

添加企业微信群组权限解析函数：

```typescript
export function resolveWeComGroupRequireMention(params: GroupMentionParams): boolean
export function resolveWeComGroupToolPolicy(params: GroupMentionParams): GroupToolPolicyConfig | undefined
```

## 消息流程

### 接收消息流程

```
企业微信服务器
    ↓ (推送加密消息)
Moltbot Webhook 服务器 (Fastify)
    ↓ (验证签名)
WeComCrypto.decrypt()
    ↓ (解密后的 JSON)
WeComMessageEvent
    ↓ (根据消息类型分发)
handleMessage()
    ├─ 文本消息 → handleTextMessage()
    ├─ 媒体消息 → handleMediaMessage()
    └─ 事件消息 → handleEventMessage()
    ↓ (路由到 AI Agent)
处理并生成响应
```

### 发送消息流程

```
sendMessageWeCom()
    ↓ (解析目标)
parseWeComTarget()
    ↓ (格式化消息)
markdownToWeComMarkdown()
    ↓ (消息分块)
chunkMarkdownTextWithMode()
    ↓ (如果包含媒体)
uploadMedia()
    ↓ (发送消息)
WeComApiClient.send{Text|Markdown|Image|File}()
    ↓ (返回结果)
WeComSendResult
```

## 类型安全

所有代码都使用 TypeScript 严格类型检查：

```typescript
export interface WeComMessageEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: "text" | "image" | "voice" | "video" | "file" | "event";
  MsgId?: string;
  AgentID: number;
  Content?: string;
  // ... 其他字段
}
```

## 测试建议

建议创建以下测试文件：

1. `crypto.test.ts` - 测试加解密功能
2. `api.test.ts` - 测试 API 客户端
3. `targets.test.ts` - 测试目标解析
4. `format.test.ts` - 测试消息格式化
5. `send.test.ts` - 测试消息发送

## 扩展点

如果需要扩展企业微信通道的功能：

1. **添加新的消息类型**: 在 `api.ts` 和 `send.ts` 中添加支持
2. **自定义消息格式化**: 在 `format.ts` 中添加新的格式化函数
3. **添加事件处理**: 在 `bot.ts` 的 `handleEventMessage` 中添加新事件
4. **集成更多 API**: 在 `api.ts` 中添加新的 API 方法

## 注意事项

1. **Token 有效期**: 企业微信 Access Token 有效期 2 小时，实现中已自动处理
2. **消息加解密**: 企业微信要求所有消息都必须加密，使用 AES-256-CBC 算法
3. **API 限流**: 注意企业微信 API 的调用频率限制
4. **媒体文件大小**: 企业微信限制临时素材文件大小为 20MB
5. **Markdown 限制**: 企业微信 Markdown 支持的语法有限，已在 `format.ts` 中处理

## 参考资源

- [企业微信开发者中心](https://developer.work.weixin.qq.com)
- [智能机器人概述](https://developer.work.weixin.qq.com/document/path/101039)
- [接收消息与事件](https://developer.work.weixin.qq.com/document/path/90668)
- [发送消息](https://developer.work.weixin.qq.com/document/path/90236)
- [回调加解密](https://developer.work.weixin.qq.com/document/path/90930)
