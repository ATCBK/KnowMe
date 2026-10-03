import { isAdminSession } from "@/lib/admin-auth";
import { createMemory, listMemories } from "@/lib/memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = new Set(["identity", "experience", "project", "skill", "thinking", "preference", "contact", "faq", "other"]);
const visibility = new Set(["public", "private"]);
const statuses = new Set(["draft", "published"]);

function cleanMemory(input: Record<string, unknown>) {
  const tags = Array.isArray(input.tags) ? input.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 20) : [];
  return {
    title: typeof input.title === "string" ? input.title.trim().slice(0, 160) : "",
    content: typeof input.content === "string" ? input.content.trim().slice(0, 12_000) : "",
    category: typeof input.category === "string" && categories.has(input.category) ? input.category : "other",
    tags,
    visibility: typeof input.visibility === "string" && visibility.has(input.visibility) ? input.visibility : "private",
    status: typeof input.status === "string" && statuses.has(input.status) ? input.status : "draft",
    priority: typeof input.priority === "number" && Number.isFinite(input.priority) ? Math.max(-100, Math.min(100, Math.round(input.priority))) : 0,
  } as const;
}

export async function GET() {
  if (!(await isAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ memories: await listMemories() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "记忆库还没有连接，请检查 Supabase 配置。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const memory = cleanMemory(body ?? {});
  if (!memory.title || !memory.content) return Response.json({ error: "标题和内容不能为空。" }, { status: 400 });
  try {
    return Response.json({ memory: await createMemory(memory) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "保存失败，请检查 Supabase 配置。" }, { status: 503 });
  }
}
