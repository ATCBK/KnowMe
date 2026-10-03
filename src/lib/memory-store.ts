import { randomUUID } from "node:crypto";

export type MemoryVisibility = "public" | "private";
export type MemoryStatus = "draft" | "published";

export type MemoryDocument = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  visibility: MemoryVisibility;
  status: MemoryStatus;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type MemoryInput = Omit<MemoryDocument, "id" | "created_at" | "updated_at">;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function isMemoryStoreConfigured() {
  return Boolean(getSupabaseConfig());
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Memory store is not configured.");

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Memory store request failed (${response.status}): ${detail.slice(0, 240)}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const memoryColumns = "id,title,content,category,tags,visibility,status,priority,created_at,updated_at";

export async function listMemories(options: { publishedOnly?: boolean } = {}) {
  const params = new URLSearchParams({
    select: memoryColumns,
    order: "priority.desc,updated_at.desc",
  });
  if (options.publishedOnly) {
    params.set("status", "eq.published");
    params.set("visibility", "eq.public");
  }
  return request<MemoryDocument[]>(`memory_documents?${params.toString()}`);
}

export async function createMemory(input: MemoryInput) {
  const rows = await request<MemoryDocument[]>("memory_documents", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...input, id: randomUUID() }),
  });
  return rows[0];
}

export async function updateMemory(id: string, input: Partial<MemoryInput>) {
  const rows = await request<MemoryDocument[]>(`memory_documents?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(input),
  });
  return rows[0] ?? null;
}

export async function deleteMemory(id: string) {
  await request<void>(`memory_documents?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

function termsFromQuery(query: string) {
  const compact = query.toLowerCase().replace(/\s+/g, "");
  const words = compact.match(/[a-z0-9]+|[\u4e00-\u9fff]/gi) ?? [];
  const bigrams = compact.match(/[\u4e00-\u9fff]{2}/g) ?? [];
  return Array.from(new Set([...words, ...bigrams]));
}

function scoreMemory(memory: MemoryDocument, terms: string[]) {
  if (!terms.length) return memory.priority;
  const title = memory.title.toLowerCase();
  const category = memory.category.toLowerCase();
  const tags = memory.tags.join(" ").toLowerCase();
  const content = memory.content.toLowerCase();
  return terms.reduce((score, term) => {
    return score + (title.includes(term) ? 12 : 0) + (tags.includes(term) ? 8 : 0) + (category.includes(term) ? 4 : 0) + (content.includes(term) ? 1 : 0);
  }, memory.priority);
}

export async function buildMemoryContext(query: string) {
  if (!isMemoryStoreConfigured()) return "";
  try {
    const memories = await listMemories({ publishedOnly: true });
    const terms = termsFromQuery(query);
    const selected = memories
      .map((memory) => ({ memory, score: scoreMemory(memory, terms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ memory }) => memory);

    let remaining = 7_000;
    const blocks: string[] = [];
    for (const memory of selected) {
      const content = memory.content.trim().slice(0, Math.min(1_600, remaining));
      if (!content) continue;
      blocks.push(`[${memory.category || "未分类"}] ${memory.title}\n${content}`);
      remaining -= content.length;
      if (remaining <= 0) break;
    }
    return blocks.join("\n\n");
  } catch (error) {
    console.error("Unable to load public memories", error);
    return "";
  }
}
