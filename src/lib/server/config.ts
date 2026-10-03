export type ProviderConfig = {
  id: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  concurrency: number;
};

export type ChatConfig = {
  providers: ProviderConfig[];
  concurrency: number;
  queueSize: number;
  queueTimeoutMs: number;
  requestTimeoutMs: number;
  cooldownMs: number;
  requestsPerMinute: number;
  globalRequestsPerMinute: number;
  globalRequestsPerHour: number;
  allowedOrigins: string[];
  trustedIpHeader?: string;
};

function integer(value: unknown, fallback: number, max: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) throw new Error("Invalid chat limit configuration");
  return parsed;
}

function provider(value: unknown, index: number): ProviderConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid provider configuration");
  const entry = value as Record<string, unknown>;
  if (typeof entry.apiKey !== "string" || !entry.apiKey.trim() || /[\r\n]/.test(entry.apiKey)) throw new Error("Missing provider key");
  if (typeof entry.model !== "string" || !entry.model.trim() || entry.model.length > 200) throw new Error("Invalid provider model");
  if (typeof entry.baseUrl !== "string") throw new Error("Missing provider URL");
  const url = new URL(entry.baseUrl);
  // Credentials never follow redirects; endpoints are configured only by the operator.
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Provider URL must use HTTPS");
  return { id: `provider-${index + 1}`, apiKey: entry.apiKey, model: entry.model, baseUrl: url.toString().replace(/\/$/, ""), concurrency: integer(entry.concurrency, 2, 32) };
}

export function readChatConfig(env: NodeJS.ProcessEnv = process.env): ChatConfig {
  let providers: ProviderConfig[] = [];
  if (env.AGENT_PROVIDERS) {
    const entries: unknown = JSON.parse(env.AGENT_PROVIDERS);
    if (!Array.isArray(entries) || !entries.length || entries.length > 8) throw new Error("Configure between 1 and 8 providers");
    providers = entries.map(provider);
  } else if (env.AGENT_API_KEY ?? env.LLM_API_KEY) {
    providers = [provider({ apiKey: env.AGENT_API_KEY ?? env.LLM_API_KEY, baseUrl: env.AGENT_BASE_URL ?? env.LLM_BASE_URL ?? "https://api.deepseek.com", model: env.AGENT_MODEL ?? env.LLM_MODEL ?? "deepseek-flash", concurrency: env.AGENT_PROVIDER_CONCURRENCY }, 0)];
  }
  const allowedOrigins = (env.APP_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean).map((origin) => {
    const url = new URL(origin);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) throw new Error("APP_ORIGINS must contain exact origins");
    if (env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Production origins must use HTTPS");
    return origin;
  });
  if (env.NODE_ENV === "production" && !allowedOrigins.length) throw new Error("APP_ORIGINS is required in production");
  const trustedIpHeader = env.CHAT_TRUSTED_IP_HEADER?.trim().toLowerCase() || undefined;
  if (trustedIpHeader && !/^[a-z0-9-]+$/.test(trustedIpHeader)) throw new Error("Invalid trusted IP header");
  return {
    providers, allowedOrigins, trustedIpHeader,
    concurrency: integer(env.CHAT_MAX_CONCURRENCY, 4, 64),
    queueSize: integer(env.CHAT_MAX_QUEUE, 16, 256),
    queueTimeoutMs: integer(env.CHAT_QUEUE_TIMEOUT_MS, 10_000, 60_000),
    requestTimeoutMs: integer(env.CHAT_REQUEST_TIMEOUT_MS, 60_000, 120_000),
    cooldownMs: integer(env.CHAT_PROVIDER_COOLDOWN_MS, 30_000, 300_000),
    requestsPerMinute: integer(env.CHAT_REQUESTS_PER_MINUTE, 10, 1_000),
    globalRequestsPerMinute: integer(env.CHAT_GLOBAL_REQUESTS_PER_MINUTE, 60, 10_000),
    globalRequestsPerHour: integer(env.CHAT_GLOBAL_REQUESTS_PER_HOUR, 300, 100_000),
  };
}
