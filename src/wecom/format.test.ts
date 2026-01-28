/**
 * 企业微信格式化测试
 */

import { describe, it, expect } from "vitest";
import {
  markdownToWeComMarkdown,
  plainTextToWeComMarkdown,
  truncateWeComMessage,
  formatWeComTextCard,
} from "./format";

describe("markdownToWeComMarkdown", () => {
  it("should convert bold syntax", () => {
    const result = markdownToWeComMarkdown("**bold text**");
    expect(result).toBe("*bold text*");
  });

  it("should preserve links", () => {
    const result = markdownToWeComMarkdown("[link](https://example.com)");
    expect(result).toBe("[link](https://example.com)");
  });

  it("should preserve inline code", () => {
    const result = markdownToWeComMarkdown("`code`");
    expect(result).toBe("`code`");
  });

  it("should convert code blocks to inline code", () => {
    const result = markdownToWeComMarkdown("```code block```");
    expect(result).toBe("`代码块`");
  });

  it("should convert multi-level headers to level 1", () => {
    const result = markdownToWeComMarkdown("## Header");
    expect(result).toBe("# Header");
  });

  it("should handle complex markdown", () => {
    const result = markdownToWeComMarkdown(
      "# Title\n\n**Bold** and _italic_ text with [link](https://example.com) and `code`.",
    );
    expect(result).toContain("# Title");
    expect(result).toContain("*Bold*");
    expect(result).toContain("[link](https://example.com)");
    expect(result).toContain("`code`");
  });
});

describe("plainTextToWeComMarkdown", () => {
  it("should preserve line breaks", () => {
    const result = plainTextToWeComMarkdown("Line 1\nLine 2\nLine 3");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
    expect(result).toContain("Line 3");
  });

  it("should preserve double line breaks", () => {
    const result = plainTextToWeComMarkdown("Para 1\n\nPara 2");
    expect(result).toContain("Para 1");
    expect(result).toContain("Para 2");
  });
});

describe("truncateWeComMessage", () => {
  it("should not truncate short message", () => {
    const result = truncateWeComMessage("Short message", 4096);
    expect(result).toBe("Short message");
  });

  it("should truncate long message", () => {
    const longMessage = "A".repeat(5000);
    const result = truncateWeComMessage(longMessage, 4096);
    expect(result.length).toBeLessThanOrEqual(4096);
    expect(result).toContain("...(已截断)");
  });

  it("should handle default limit", () => {
    const longMessage = "A".repeat(5000);
    const result = truncateWeComMessage(longMessage);
    expect(result.length).toBeLessThanOrEqual(4096);
  });
});

describe("formatWeComTextCard", () => {
  it("should format text card", () => {
    const options = {
      title: "Card Title",
      description: "Card Description",
      url: "https://example.com",
      btnText: "Click",
    };
    const result = formatWeComTextCard(options);
    const parsed = JSON.parse(result);
    expect(parsed.title).toBe("Card Title");
    expect(parsed.description).toBe("Card Description");
    expect(parsed.url).toBe("https://example.com");
    expect(parsed.btntxt).toBe("Click");
  });

  it("should use default button text", () => {
    const options = {
      title: "Title",
      description: "Description",
      url: "https://example.com",
    };
    const result = formatWeComTextCard(options);
    const parsed = JSON.parse(result);
    expect(parsed.btntxt).toBe("详情");
  });
});
