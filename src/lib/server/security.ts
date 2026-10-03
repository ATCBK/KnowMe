import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { ChatConfig } from "./config";
import { HttpError } from "./errors";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export const MAX_HISTORY = 20;
export const MAX_MESSAGE_CHARS = 4_000;
export const MAX_TOTAL_CHARS = 16_000;
const MAX_BODY_BYTES = 32_768;

export function checkRequest(request: Request, config: ChatConfig): string {
  const origin = request.headers.get("origin");
  const allowedOrigins = config.allowedOrigins.length ? config.allowedOrigins : [new URL(request.url).origin];
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin !== null && !allowedOrigins.includes(origin))) {
    throw new HttpError(403, "ORIGIN_FORBIDDEN", "不允许此来源的请求。");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new HttpError(415, "INVALID_CONTENT_TYPE", "请发送 JSON 格式的请求。");
  }
  if (request.headers.has("content-encoding") && request.headers.get("content-encoding") !== "identity") {
    throw new HttpError(415, "INVALID_ENCODING", "不支持压缩请求体。");
  }
  // Only trust an IP header overwritten by a configured proxy. Never implicitly trust X-Forwarded-For.
  const ip = config.trustedIpHeader ? request.headers.get(config.trustedIpHeader)?.trim() : undefined;
  return ip && isIP(ip) ? createHash("sha256").update(ip).digest("hex") : "shared-unidentified";
}

export async function readMessages(request: Request, signal: AbortSignal): Promise<ChatMessage[]> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new HttpError(413, "BODY_TOO_LARGE", "请求内容过长，请缩短对话。");
  }
  if (!request.body) throw new HttpError(400, "INVALID_BODY", "请求缺少对话内容。");
  const reader = request.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        throw new HttpError(413, "BODY_TOO_LARGE", "请求内容过长，请缩短对话。");
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_BODY", "请求内容不是有效的 JSON。");
  }
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) throw new HttpError(400, "INVALID_MESSAGES", "请求缺少有效的对话记录。");
  const entries = (body as { messages: unknown[] }).messages;
  if (!entries.length || entries.length > MAX_HISTORY) throw new HttpError(400, "INVALID_MESSAGES", "对话记录最多包含 20 条消息。");
  let total = 0;
  const messages = entries.map((entry): ChatMessage => {
    if (!entry || typeof entry !== "object") throw new HttpError(400, "INVALID_MESSAGES", "对话记录格式不正确。");
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim() || content.length > MAX_MESSAGE_CHARS) throw new HttpError(400, "INVALID_MESSAGES", "每条消息需要有效角色和最多 4000 字的文本。");
    total += content.length;
    return { role, content: content.trim() };
  });
  if (total > MAX_TOTAL_CHARS) throw new HttpError(413, "CONTEXT_TOO_LARGE", "对话上下文过长，请开始新的对话。");
  if (messages.at(-1)?.role !== "user") throw new HttpError(400, "INVALID_MESSAGES", "最后一条消息必须是提问。");
  return messages;
}

type Window = { start: number; count: number };
export class RateLimiter {
  private identities = new Map<string, Window>();
  private minute: Window = { start: 0, count: 0 };
  private hour: Window = { start: 0, count: 0 };
  constructor(private config: Pick<ChatConfig, "requestsPerMinute" | "globalRequestsPerMinute" | "globalRequestsPerHour">) {}

  check(identity: string, now = Date.now()) {
    // Expire entries on admission and fail closed at the memory cap.
    for (const [key, value] of this.identities) if (now - value.start >= 60_000) this.identities.delete(key);
    if (now - this.minute.start >= 60_000) this.minute = { start: now, count: 0 };
    if (now - this.hour.start >= 3_600_000) this.hour = { start: now, count: 0 };
    const user = this.identities.get(identity) ?? { start: now, count: 0 };
    const checks: [Window, number, number][] = [[user, this.config.requestsPerMinute, 60_000], [this.minute, this.config.globalRequestsPerMinute, 60_000], [this.hour, this.config.globalRequestsPerHour, 3_600_000]];
    for (const [window, limit, period] of checks) {
      if (window.count >= limit) throw new HttpError(429, "RATE_LIMITED", "提问太频繁，请稍后再试。", Math.max(1, Math.ceil((window.start + period - now) / 1000)));
    }
    if (!this.identities.has(identity) && this.identities.size >= 10_000) throw new HttpError(429, "RATE_LIMITED", "当前访问人数较多，请稍后再试。", 60);
    user.count++;
    this.minute.count++;
    this.hour.count++;
    this.identities.set(identity, user);
  }
}
