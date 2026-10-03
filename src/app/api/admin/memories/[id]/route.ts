import { isAdminSession } from "@/lib/admin-auth";
import { deleteMemory, updateMemory, type MemoryInput } from "@/lib/memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 20) : [];
  const input: Partial<MemoryInput> = {
    ...(typeof body?.title === "string" ? { title: body.title.trim().slice(0, 160) } : {}),
    ...(typeof body?.content === "string" ? { content: body.content.trim().slice(0, 12_000) } : {}),
    ...(typeof body?.category === "string" ? { category: body.category } : {}),
    ...(Array.isArray(body?.tags) ? { tags } : {}),
    ...(body?.visibility === "public" || body?.visibility === "private" ? { visibility: body.visibility } : {}),
    ...(body?.status === "draft" || body?.status === "published" ? { status: body.status } : {}),
    ...(typeof body?.priority === "number" && Number.isFinite(body.priority) ? { priority: Math.round(body.priority) } : {}),
  };
  if ("title" in input && !input.title) return Response.json({ error: "标题不能为空。" }, { status: 400 });
  if ("content" in input && !input.content) return Response.json({ error: "内容不能为空。" }, { status: 400 });
  try {
    return Response.json({ memory: await updateMemory(id, input) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "更新失败。" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    await deleteMemory(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "删除失败。" }, { status: 503 });
  }
}
