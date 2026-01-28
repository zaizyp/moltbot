/**
 * 企业微信 API 客户端
 * 参考文档：https://developer.work.weixin.qq.com/document/path/90665
 */

import type { Fetch } from "../utils.js";
import type { WeComApiResponse, WeComAccessTokenResponse, WeComMediaUploadResponse } from "./types.js";

const WECHAT_API_BASE = "https://qyapi.weixin.qq.com/cgi-bin";

export class WeComApiClient {
  private readonly corpId: string;
  private readonly secret: string;
  private readonly agentId: number;
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private fetch: Fetch;

  constructor(options: {
    corpId: string;
    secret: string;
    agentId: number;
    fetch?: Fetch;
  }) {
    this.corpId = options.corpId;
    this.secret = options.secret;
    this.agentId = options.agentId;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * 获取访问令牌
   * 文档：https://developer.work.weixin.qq.com/document/path/91039
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const url = `${WECHAT_API_BASE}/gettoken?corpid=${encodeURIComponent(
      this.corpId,
    )}&corpsecret=${encodeURIComponent(this.secret)}`;

    const response = await this.fetch(url);
    const data: WeComApiResponse<WeComAccessTokenResponse> = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to get access token: ${data.errcode} ${data.errmsg}`);
    }

    this.accessToken = (data as unknown as WeComAccessTokenResponse).access_token;
    this.accessTokenExpiresAt = now + ((data as unknown as WeComAccessTokenResponse).expires_in - 300) * 1000;

    return this.accessToken!;
  }

  /**
   * 发送文本消息
   * 文档：https://developer.work.weixin.qq.com/document/path/90236
   */
  async sendText(userId: string, content: string): Promise<void> {
    const token = await this.getAccessToken();
    const url = `${WECHAT_API_BASE}/message/send?access_token=${token}`;

    const body = {
      touser: userId,
      msgtype: "text",
      agentid: this.agentId,
      text: { content },
    };

    const response = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: WeComApiResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to send text: ${data.errcode} ${data.errmsg}`);
    }
  }

  /**
   * 发送 Markdown 消息
   * 文档：https://developer.work.weixin.qq.com/document/path/90236
   */
  async sendMarkdown(userId: string, content: string): Promise<void> {
    const token = await this.getAccessToken();
    const url = `${WECHAT_API_BASE}/message/send?access_token=${token}`;

    const body = {
      touser: userId,
      msgtype: "markdown",
      agentid: this.agentId,
      markdown: { content },
    };

    const response = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: WeComApiResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to send markdown: ${data.errcode} ${data.errmsg}`);
    }
  }

  /**
   * 发送文本卡片消息
   * 文档：https://developer.work.weixin.qq.com/document/path/90236
   */
  async sendTextCard(
    userId: string,
    title: string,
    description: string,
    url: string,
    btnText: string = "详情",
  ): Promise<void> {
    const token = await this.getAccessToken();
    const urlApi = `${WECHAT_API_BASE}/message/send?access_token=${token}`;

    const body = {
      touser: userId,
      msgtype: "textcard",
      agentid: this.agentId,
      textcard: {
        title,
        description,
        url,
        btntxt: btnText,
      },
    };

    const response = await this.fetch(urlApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: WeComApiResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to send textcard: ${data.errcode} ${data.errmsg}`);
    }
  }

  /**
   * 发送图片消息
   * 文档：https://developer.work.weixin.qq.com/document/path/90236
   */
  async sendImage(userId: string, mediaId: string): Promise<void> {
    const token = await this.getAccessToken();
    const url = `${WECHAT_API_BASE}/message/send?access_token=${token}`;

    const body = {
      touser: userId,
      msgtype: "image",
      agentid: this.agentId,
      image: { media_id: mediaId },
    };

    const response = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: WeComApiResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to send image: ${data.errcode} ${data.errmsg}`);
    }
  }

  /**
   * 发送文件消息
   * 文档：https://developer.work.weixin.qq.com/document/path/90236
   */
  async sendFile(userId: string, mediaId: string): Promise<void> {
    const token = await this.getAccessToken();
    const url = `${WECHAT_API_BASE}/message/send?access_token=${token}`;

    const body = {
      touser: userId,
      msgtype: "file",
      agentid: this.agentId,
      file: { media_id: mediaId },
    };

    const response = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: WeComApiResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to send file: ${data.errcode} ${data.errmsg}`);
    }
  }

  /**
   * 上传临时素材
   * 文档：https://developer.work.weixin.qq.com/document/path/90253
   */
  async uploadMedia(
    type: "image" | "voice" | "video" | "file",
    file: Buffer | Blob,
    filename: string,
  ): Promise<string> {
    const token = await this.getAccessToken();
    const url = `${WECHAT_API_BASE}/media/upload?access_token=${token}&type=${type}`;

    const formData = new FormData();
    formData.append("media", file, filename);

    const response = await this.fetch(url, {
      method: "POST",
      body: formData,
    });

    const data: WeComApiResponse<WeComMediaUploadResponse> = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to upload media: ${data.errcode} ${data.errmsg}`);
    }

    return (data as unknown as WeComMediaUploadResponse).media_id;
  }

  /**
   * 获取临时素材
   * 文档：https://developer.work.weixin.qq.com/document/path/90254
   */
  async getMedia(mediaId: string): Promise<Blob> {
    const token = await this.getAccessToken();
    const url = `${WECHAT_API_BASE}/media/get?access_token=${token}&media_id=${mediaId}`;

    const response = await this.fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get media: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  }
}
