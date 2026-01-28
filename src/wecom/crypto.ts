/**
 * 企业微信消息加解密
 * 参考文档：https://developer.work.weixin.qq.com/document/path/90930
 */

import * as crypto from "crypto";

const PKCS7Decoder = {
  decode(buffer: Buffer): Buffer {
    const pad = buffer[buffer.length - 1];
    if (pad < 1 || pad > 32) {
      pad = 0;
    }
    return buffer.subarray(0, buffer.length - pad);
  },
  encode(buffer: Buffer, blocksize: number): Buffer {
    const pad = blocksize - (buffer.length % blocksize);
    const result = Buffer.alloc(buffer.length + pad);
    buffer.copy(result);
    for (let i = buffer.length; i < result.length; i++) {
      result[i] = pad;
    }
    return result;
  },
};

export interface WeComCryptoOptions {
  token: string;
  encodingAESKey: string;
  corpId: string;
}

export class WeComCrypto {
  private readonly token: string;
  private readonly encodingAESKey: Buffer;
  private readonly corpId: string;

  constructor(options: WeComCryptoOptions) {
    this.token = options.token;
    this.encodingAESKey = Buffer.from(options.encodingAESKey + "=", "base64");
    this.corpId = options.corpId;
  }

  /**
   * 验证签名
   */
  verifySignature(signature: string, timestamp: number, nonce: string, echostr?: string): boolean {
    const arr = [this.token, String(timestamp), nonce];
    if (echostr !== undefined) {
      arr.push(echostr);
    }
    const raw = arr.sort().join("");
    const sha1 = crypto.createHash("sha1");
    sha1.update(raw);
    const hash = sha1.digest("hex");
    return hash === signature;
  }

  /**
   * 解密消息
   */
  decrypt(encryptedMsg: string): string {
    const encrypted = Buffer.from(encryptedMsg, "base64");
    const iv = this.encodingAESKey.subarray(0, 16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.encodingAESKey, iv);
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const decoded = PKCS7Decoder.decode(decrypted);

    // 消息格式：msg_len(4 bytes) + msg + corpId
    const msgLen = decoded.readUInt32BE(0);
    const msg = decoded.subarray(4, 4 + msgLen).toString("utf8");
    const corpId = decoded.subarray(4 + msgLen).toString("utf8");

    if (corpId !== this.corpId) {
      throw new Error(`CorpId mismatch: expected ${this.corpId}, got ${corpId}`);
    }

    return msg;
  }

  /**
   * 加密消息
   */
  encrypt(msg: string): string {
    const msgBuffer = Buffer.from(msg, "utf8");
    const msgLenBuffer = Buffer.alloc(4);
    msgLenBuffer.writeUInt32BE(msgBuffer.length, 0);
    const corpIdBuffer = Buffer.from(this.corpId, "utf8");
    const raw = Buffer.concat([msgLenBuffer, msgBuffer, corpIdBuffer]);
    const encoded = PKCS7Decoder.encode(raw, 32);

    const iv = this.encodingAESKey.subarray(0, 16);
    const cipher = crypto.createEncryptiv("aes-256-cbc", this.encodingAESKey, iv);
    const encrypted = Buffer.concat([cipher.update(encoded), cipher.final()]);

    return encrypted.toString("base64");
  }

  /**
   * 生成签名
   */
  getSignature(timestamp: number, nonce: string, msg: string): string {
    const arr = [this.token, String(timestamp), nonce, msg];
    const raw = arr.sort().join("");
    const sha1 = crypto.createHash("sha1");
    sha1.update(raw);
    return sha1.digest("hex");
  }

  /**
   * 验证 URL
   */
  verifyUrl(signature: string, timestamp: number, nonce: string, echostr: string): string {
    if (!this.verifySignature(signature, timestamp, nonce, echostr)) {
      throw new Error("Invalid signature");
    }
    return this.decrypt(echostr);
  }
}
