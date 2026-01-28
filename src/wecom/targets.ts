/**
 * 企业微信目标解析
 */

export interface WeComTarget {
  kind: "user" | "party" | "tag";
  id: string;
  original: string;
}

/**
 * 解析企业微信目标
 * 支持格式：
 * - 用户ID: "USERID" 或 "user:USERID"
 * - 部门ID: "party:PARTYID"
 * - 标签ID: "tag:TAGID"
 */
export function parseWeComTarget(raw: string): WeComTarget | undefined {
  if (!raw || typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();

  // 显式指定类型
  if (trimmed.startsWith("user:")) {
    const userId = trimmed.slice(5).trim();
    if (userId) {
      return { kind: "user", id: userId, original: trimmed };
    }
  }

  if (trimmed.startsWith("party:")) {
    const partyId = trimmed.slice(6).trim();
    if (partyId) {
      return { kind: "party", id: partyId, original: trimmed };
    }
  }

  if (trimmed.startsWith("tag:")) {
    const tagId = trimmed.slice(4).trim();
    if (tagId) {
      return { kind: "tag", id: tagId, original: trimmed };
    }
  }

  // 默认为用户 ID
  if (trimmed) {
    return { kind: "user", id: trimmed, original: trimmed };
  }

  return undefined;
}

/**
 * 格式化目标显示
 */
export function formatWeComTargetDisplay(target: WeComTarget): string {
  switch (target.kind) {
    case "user":
      return target.original;
    case "party":
      return `部门: ${target.id}`;
    case "tag":
      return `标签: ${target.id}`;
    default:
      return target.original;
  }
}

/**
 * 验证目标是否有效
 */
export function isValidWeComTarget(target: WeComTarget): boolean {
  return Boolean(target.id && target.kind);
}

/**
 * 标准化目标字符串
 */
export function normalizeWeComTarget(raw: string): string | undefined {
  const target = parseWeComTarget(raw);
  return target?.id;
}

/**
 * 判断是否像企业微信用户ID
 */
export function looksLikeWeComUserId(raw: string): boolean {
  if (!raw || typeof raw !== "string") {
    return false;
  }
  const trimmed = raw.trim();
  // 企业微信用户ID通常是字母数字组合
  return /^[A-Za-z0-9\-_]+$/.test(trimmed);
}
