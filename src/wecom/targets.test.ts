/**
 * 企业微信目标解析测试
 */

import { describe, it, expect } from "vitest";
import {
  parseWeComTarget,
  formatWeComTargetDisplay,
  isValidWeComTarget,
  normalizeWeComTarget,
  looksLikeWeComUserId,
} from "./targets";

describe("parseWeComTarget", () => {
  it("should parse plain user ID", () => {
    const result = parseWeComTarget("zhangsan");
    expect(result).toEqual({
      kind: "user",
      id: "zhangsan",
      original: "zhangsan",
    });
  });

  it("should parse user: prefix", () => {
    const result = parseWeComTarget("user:lisi");
    expect(result).toEqual({
      kind: "user",
      id: "lisi",
      original: "user:lisi",
    });
  });

  it("should parse party: prefix", () => {
    const result = parseWeComTarget("party:1");
    expect(result).toEqual({
      kind: "party",
      id: "1",
      original: "party:1",
    });
  });

  it("should parse tag: prefix", () => {
    const result = parseWeComTarget("tag:2");
    expect(result).toEqual({
      kind: "tag",
      id: "2",
      original: "tag:2",
    });
  });

  it("should handle empty string", () => {
    const result = parseWeComTarget("");
    expect(result).toBeUndefined();
  });

  it("should handle whitespace", () => {
    const result = parseWeComTarget("  zhangsan  ");
    expect(result).toEqual({
      kind: "user",
      id: "zhangsan",
      original: "zhangsan",
    });
  });
});

describe("formatWeComTargetDisplay", () => {
  it("should format user target", () => {
    const target = { kind: "user" as const, id: "zhangsan", original: "zhangsan" };
    const result = formatWeComTargetDisplay(target);
    expect(result).toBe("zhangsan");
  });

  it("should format party target", () => {
    const target = { kind: "party" as const, id: "1", original: "party:1" };
    const result = formatWeComTargetDisplay(target);
    expect(result).toBe("部门: 1");
  });

  it("should format tag target", () => {
    const target = { kind: "tag" as const, id: "2", original: "tag:2" };
    const result = formatWeComTargetDisplay(target);
    expect(result).toBe("标签: 2");
  });
});

describe("isValidWeComTarget", () => {
  it("should validate user target", () => {
    const target = { kind: "user" as const, id: "zhangsan", original: "zhangsan" };
    expect(isValidWeComTarget(target)).toBe(true);
  });

  it("should validate party target", () => {
    const target = { kind: "party" as const, id: "1", original: "party:1" };
    expect(isValidWeComTarget(target)).toBe(true);
  });

  it("should reject target without id", () => {
    const target = { kind: "user" as const, id: "", original: "" };
    expect(isValidWeComTarget(target)).toBe(false);
  });
});

describe("normalizeWeComTarget", () => {
  it("should normalize user ID", () => {
    expect(normalizeWeComTarget("zhangsan")).toBe("zhangsan");
  });

  it("should normalize user: prefix", () => {
    expect(normalizeWeComTarget("user:lisi")).toBe("lisi");
  });

  it("should normalize party: prefix", () => {
    expect(normalizeWeComTarget("party:1")).toBe("1");
  });

  it("should handle empty string", () => {
    expect(normalizeWeComTarget("")).toBeUndefined();
  });
});

describe("looksLikeWeComUserId", () => {
  it("should identify alphanumeric user ID", () => {
    expect(looksLikeWeComUserId("zhangsan")).toBe(true);
  });

  it("should identify user ID with hyphens", () => {
    expect(looksLikeWeComUserId("zhang-san")).toBe(true);
  });

  it("should identify user ID with underscores", () => {
    expect(looksLikeWeComUserId("zhang_san")).toBe(true);
  });

  it("should reject invalid user ID", () => {
    expect(looksLikeWeComUserId("zhang san")).toBe(false);
  });

  it("should handle empty string", () => {
    expect(looksLikeWeComUserId("")).toBe(false);
  });
});
