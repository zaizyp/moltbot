/**
 * 企业微信加密模块测试
 */

import { describe, it, expect } from "vitest";
import { WeComCrypto } from "./crypto";

describe("WeComCrypto", () => {
  const crypto = new WeComCrypto({
    token: "test_token",
    encodingAESKey: "kWxPEV2UEDyw2Q9QY5zJFLYlSv6oW1E3hT6Y5R9gZ8w".replace(/=/g, ""),
    corpId: "ww1234567890abcdef",
  });

  describe("verifySignature", () => {
    it("should verify correct signature", () => {
      const timestamp = 1234567890;
      const nonce = "nonce123";
      const echostr = "echostr";

      // 简单测试：使用相同的值生成签名并验证
      const arr = [crypto["token"], String(timestamp), nonce, echostr];
      const raw = arr.sort().join("");
      const cryptoImpl = require("crypto");
      const sha1 = cryptoImpl.createHash("sha1");
      sha1.update(raw);
      const signature = sha1.digest("hex");

      const result = crypto.verifySignature(signature, timestamp, nonce, echostr);
      expect(result).toBe(true);
    });

    it("should reject incorrect signature", () => {
      const result = crypto.verifySignature("wrong_signature", 1234567890, "nonce123", "echostr");
      expect(result).toBe(false);
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt message correctly", () => {
      const message = "test message";
      const encrypted = crypto.encrypt(message);
      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toBe(message);
    });

    it("should handle unicode characters", () => {
      const message = "测试消息 🎉";
      const encrypted = crypto.encrypt(message);
      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toBe(message);
    });
  });

  describe("getSignature", () => {
    it("should generate consistent signature", () => {
      const timestamp = 1234567890;
      const nonce = "nonce123";
      const msg = "test message";

      const signature1 = crypto.getSignature(timestamp, nonce, msg);
      const signature2 = crypto.getSignature(timestamp, nonce, msg);

      expect(signature1).toBe(signature2);
    });
  });
});
