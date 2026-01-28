# 企业微信 (WeCom) 通道配置指南

## 概述

企业微信通道允许 Moltbot 通过企业微信智能机器人接收和发送消息。该通道支持 Webhook 回调、Markdown 消息、文件上传/下载等功能。

## 前置要求

1. 企业微信管理员权限
2. 创建企业微信应用并获取相关凭证

## 配置步骤

### 1. 创建企业微信应用

1. 登录企业微信管理后台：https://work.weixin.qq.com
2. 进入"应用管理" → "应用" → "创建应用"
3. 选择"智能机器人"类型
4. 填写应用信息并创建

### 2. 获取应用凭证

在企业微信应用详情页面，获取以下信息：

- **corpId**: 企业 ID（企业微信管理后台 → "我的企业" → 企业信息）
- **secret**: 应用的 Secret（应用详情页面 → 开发者凭证）
- **agentId**: 应用的 AgentId（应用详情页面）

### 3. 配置 Webhook

1. 在 Moltbot 配置文件中设置 Webhook 服务器端口（默认 3000）
2. 在企业微信应用详情页面，找到"接收消息"设置
3. 填写回调 URL：`https://your-domain.com/wecom/webhook`
4. 生成并设置 Token 和 EncodingAESKey

### 4. 配置 Moltbot

在 Moltbot 配置文件中添加企业微信通道配置：

```json5
{
  "channels": {
    "wecom": {
      "corpId": "ww1234567890abcdef",
      "secret": "your_secret_here",
      "agentId": 1000001,
      "token": "your_token_here",
      "encodingAESKey": "your_encoding_aes_key_here",
      "webhookUrl": "https://your-domain.com/wecom/webhook",
      "webhookPath": "/wecom/webhook",
      "port": 3000,
      "enabled": true,
      "dmPolicy": "pairing",
      "allowFrom": ["*"],
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["department_id_1", "department_id_2"],
      "replyToMode": "off",
      "mediaMaxMb": 10,
      "timeoutSeconds": 30
    }
  }
}
```

## 配置项说明

| 配置项 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `corpId` | string | 是 | 企业 ID |
| `secret` | string | 是 | 应用 Secret |
| `agentId` | number | 是 | 应用 AgentId |
| `token` | string | 是 | Webhook 验证 Token |
| `encodingAESKey` | string | 是 | 消息加解密密钥 |
| `webhookUrl` | string | 否 | Webhook 回调 URL（外网可访问） |
| `webhookPath` | string | 否 | Webhook 路径（默认 `/wecom/webhook`） |
| `port` | number | 否 | Webhook 服务器端口（默认 3000） |
| `enabled` | boolean | 否 | 是否启用通道（默认 true） |
| `dmPolicy` | string | 否 | 私信策略：`pairing`, `allowlist`, `open` |
| `allowFrom` | array | 否 | 允许发送私信的用户 ID 列表 |
| `groupPolicy` | string | 否 | 群组策略：`blocked`, `allowed`, `unmentioned`, `open` |
| `groupAllowFrom` | array | 否 | 允许发送群消息的部门/群组 ID 列表 |
| `replyToMode` | string | 否 | 回复模式：`off`, `first`, `all` |
| `mediaMaxMb` | number | 否 | 最大媒体文件大小（MB） |
| `timeoutSeconds` | number | 否 | API 请求超时时间（秒） |
| `proxy` | string | 否 | 代理服务器地址 |

## 环境变量

也可以通过环境变量配置核心凭证：

```bash
export WECOM_CORPID="your_corp_id"
export WECOM_SECRET="your_secret"
```

## 多账户配置

支持配置多个企业微信账户：

```json5
{
  "channels": {
    "wecom": {
      "defaultAccountId": "primary",
      "accounts": {
        "primary": {
          "corpId": "ww1234567890abcdef",
          "secret": "primary_secret",
          "agentId": 1000001,
          "token": "primary_token",
          "encodingAESKey": "primary_key"
        },
        "secondary": {
          "corpId": "ww0987654321fedcba",
          "secret": "secondary_secret",
          "agentId": 1000002,
          "token": "secondary_token",
          "encodingAESKey": "secondary_key"
        }
      }
    }
  }
}
```

## 消息类型支持

- **文本消息**: 纯文本消息
- **Markdown 消息**: 支持加粗、斜体、链接、代码等
- **图片消息**: 上传并发送图片
- **文件消息**: 上传并发送文件
- **语音消息**: 上传并发送语音
- **视频消息**: 上传并发送视频

## Markdown 语法

企业微信支持的 Markdown 语法：

- `# 标题`: 一级标题
- `*加粗*`: 加粗文本
- `_斜体_`: 斜体文本
- `[链接](url)`: 链接
- `` `代码` ``: 代码
- `> 引用`: 引用文本

## 权限控制

### 私信策略 (dmPolicy)

- `pairing`: 需要配对后才能发送私信
- `allowlist`: 仅 `allowFrom` 列表中的用户可发送
- `open`: 所有用户可发送（需设置 `allowFrom: ["*"]`）

### 群组策略 (groupPolicy)

- `blocked`: 阻止所有群组消息
- `allowed`: 仅 `groupAllowFrom` 列表中的群组可发送
- `unmentioned`: 未被 @ 时阻止群组消息
- `open`: 允许所有群组消息

## 目标格式

发送消息时，可以使用以下目标格式：

- 用户 ID: `USERID` 或 `user:USERID`
- 部门 ID: `party:PARTYID`
- 标签 ID: `tag:TAGID`

示例：

```bash
# 发送给用户
moltbot send --channel wecom --to "user:zhangsan" "Hello"

# 发送给部门
moltbot send --channel wecom --to "party:1" "Hello Department"

# 发送给标签用户
moltbot send --channel wecom --to "tag:2" "Hello Team"
```

## 故障排除

### Webhook 验证失败

检查：
1. Token 和 EncodingAESKey 是否正确
2. 服务器是否可以从外网访问
3. 防火墙是否阻止了请求

### 消息发送失败

检查：
1. Access Token 是否有效（企业微信 Token 有效期 2 小时）
2. 用户 ID/部门 ID 是否正确
3. API 调用频率是否超限

### 媒体文件上传失败

检查：
1. 文件大小是否超过 `mediaMaxMb` 限制
2. 文件类型是否受支持
3. 网络连接是否正常

## 企业微信 API 文档

- [智能机器人概述](https://developer.work.weixin.qq.com/document/path/101039)
- [接收消息](https://developer.work.weixin.qq.com/document/path/90668)
- [发送消息](https://developer.work.weixin.qq.com/document/path/90236)
- [上传临时素材](https://developer.work.weixin.qq.com/document/path/90253)
- [加解密方案](https://developer.work.weixin.qq.com/document/path/90930)
