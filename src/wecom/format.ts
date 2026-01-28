/**
 * 企业微信消息格式化
 */

/**
 * 将 Markdown 转换为企业微信支持的 Markdown 格式
 */
export function markdownToWeComMarkdown(markdown: string): string {
  let result = markdown;

  // 企业微信 Markdown 语法参考：https://developer.work.weixin.qq.com/document/path/90236

  // 支持的语法：# 标题、*加粗*、_斜体_、[链接](url)、`代码`、> 引用
  // 不支持：## 多级标题、- 列表、1. 有序列表、``` 代码块等

  // 简化处理：移除不支持的语法
  result = result.replace(/```[\s\S]*?```/g, "`代码块`");
  result = result.replace(/^#{2,} /gm, "# ");

  // 替换链接格式：[text](url) -> [text](url) (已支持)
  // 替换代码块：`code` (已支持)
  // 替换加粗：**text** -> *text*
  result = result.replace(/\*\*([^*]+)\*\*/g, "*$1*");

  return result;
}

/**
 * 将纯文本转换为企业微信 Markdown 格式
 */
export function plainTextToWeComMarkdown(text: string): string {
  // 企业微信文本消息支持简单的换行
  return text
    .replace(/\n\n/g, "\n\n")
    .replace(/\n/g, "\n");
}

/**
 * 截断消息到指定长度
 */
export function truncateWeComMessage(text: string, maxLength = 4096): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 10) + "\n...(已截断)";
}

/**
 * 格式化企业微信消息为文本卡片
 */
export interface TextCardOptions {
  title: string;
  description: string;
  url: string;
  btnText?: string;
}

export function formatWeComTextCard(options: TextCardOptions): string {
  return JSON.stringify({
    title: options.title,
    description: options.description,
    url: options.url,
    btntxt: options.btnText ?? "详情",
  });
}
