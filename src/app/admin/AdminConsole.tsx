"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Memory = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  visibility: "public" | "private";
  status: "draft" | "published";
  priority: number;
  updated_at: string;
};

type Draft = Omit<Memory, "id" | "updated_at">;

const blankDraft: Draft = { title: "", content: "", category: "other", tags: [], visibility: "private", status: "draft", priority: 0 };
const categoryLabels: Record<string, string> = { identity: "身份", experience: "经历", project: "项目", skill: "能力", thinking: "思考", preference: "偏好", contact: "联系", faq: "问答", other: "其他" };

async function readJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: string; memories?: Memory[]; memory?: Memory };
  if (!response.ok) throw new Error(body.error || "请求失败");
  return body;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export default function AdminConsole() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMemories() {
    const body = await readJson(await fetch("/api/admin/memories", { cache: "no-store" }));
    setMemories(body.memories ?? []);
    if (!selectedId && body.memories?.[0]) selectMemory(body.memories[0]);
  }

  function selectMemory(memory: Memory) {
    setSelectedId(memory.id);
    setDraft({ title: memory.title, content: memory.content, category: memory.category, tags: memory.tags, visibility: memory.visibility, status: memory.status, priority: memory.priority });
    setNotice("");
  }

  useEffect(() => {
    fetch("/api/admin/login", { cache: "no-store" }).then((response) => response.json()).then((body: { configured?: boolean }) => setConfigured(Boolean(body.configured))).catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (authenticated) loadMemories().catch((error: unknown) => setNotice(error instanceof Error ? error.message : "记忆库读取失败"));
  }, [authenticated]);

  const visibleMemories = useMemo(() => memories.filter((memory) => {
    const haystack = `${memory.title} ${memory.content} ${memory.tags.join(" ")}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (statusFilter === "all" || memory.status === statusFilter) && (visibilityFilter === "all" || memory.visibility === visibilityFilter);
  }), [memories, query, statusFilter, visibilityFilter]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await readJson(await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }));
      setAuthenticated(true);
      setPassword("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "登录失败"); }
    finally { setBusy(false); }
  }

  function startNew() {
    setSelectedId(null);
    setDraft({ ...blankDraft, tags: [] });
    setNotice("新记忆草稿");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.content.trim()) { setNotice("标题和内容不能为空"); return; }
    setBusy(true);
    try {
      const endpoint = selectedId ? `/api/admin/memories/${selectedId}` : "/api/admin/memories";
      const response = await fetch(endpoint, { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const body = await readJson(response);
      await loadMemories();
      if (body.memory) selectMemory(body.memory);
      setNotice(draft.status === "published" ? "已保存并发布" : "草稿已保存");
    } catch (error) { setNotice(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selectedId || !window.confirm("确定删除这条记忆吗？")) return;
    setBusy(true);
    try { await readJson(await fetch(`/api/admin/memories/${selectedId}`, { method: "DELETE" })); startNew(); await loadMemories(); setNotice("已删除"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "删除失败"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setMemories([]);
    setSelectedId(null);
  }

  if (configured === null) return <main className="admin-shell admin-loading">正在连接管理入口…</main>;
  if (!configured) return <main className="admin-shell admin-gate"><div className="admin-login"><p className="admin-kicker">KNOWME / ADMIN</p><h1>先配置后台入口</h1><p>请在环境变量中设置 <code>ADMIN_PASSWORD</code> 和 <code>SUPABASE_URL</code>，然后重新加载页面。</p></div></main>;
  if (!authenticated) return <main className="admin-shell admin-gate"><form className="admin-login" onSubmit={login}><p className="admin-kicker">KNOWME / ADMIN</p><h1>记忆库入口</h1><p>只有你可以编辑 Agent 使用的个人上下文。</p><label>管理员密码<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{notice && <p className="admin-notice is-error">{notice}</p>}<button className="admin-primary" type="submit" disabled={busy}>{busy ? "验证中…" : "进入后台 ↗"}</button></form></main>;

  return <main className="admin-shell"><aside className="admin-sidebar"><div><div className="admin-brand">knowme<span>↗</span></div><p className="admin-side-copy">PERSONAL<br />MEMORY SYSTEM</p><nav><button className="admin-nav active" type="button">▣ <span>记忆库</span></button><button className="admin-nav" type="button" onClick={() => setNotice("Agent 规则目前固定在代码中，记忆内容可在这里管理。")}>›_ <span>Agent</span></button><button className="admin-nav" type="button" onClick={() => setNotice("保存后回到首页即可测试公开对话。")}>◎ <span>Preview</span></button></nav></div><div className="admin-side-foot">PRIVATE ACCESS<br /><button type="button" onClick={logout}>退出登录</button></div></aside><section className="admin-main"><header className="admin-topbar"><div><p className="admin-kicker">// PERSONAL AI MEMORY MANAGER</p><h1>记忆库</h1><p>只把你确认过的纯文本资料交给 Agent。</p></div><button className="admin-outline" type="button" onClick={startNew}>＋ 新建记忆</button></header><div className="admin-workspace"><section className="memory-list-panel"><div className="memory-list-heading"><strong>{visibleMemories.length} 条记忆</strong><span>{memories.filter((memory) => memory.status === "published" && memory.visibility === "public").length} 条公开</span></div><div className="memory-filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索记忆…" aria-label="搜索记忆" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="筛选状态"><option value="all">全部状态</option><option value="published">已发布</option><option value="draft">草稿</option></select><select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} aria-label="筛选可见性"><option value="all">全部范围</option><option value="public">公开</option><option value="private">私有</option></select></div><div className="memory-table-head"><span>标题</span><span>分类</span><span>范围</span><span>状态</span><span>更新</span></div><div className="memory-rows">{visibleMemories.map((memory) => <button key={memory.id} className={`memory-row ${selectedId === memory.id ? "selected" : ""}`} type="button" onClick={() => selectMemory(memory)}><span className="memory-title">{memory.title}</span><span>{categoryLabels[memory.category] ?? memory.category}</span><span className={`memory-status ${memory.visibility}`}>{memory.visibility === "public" ? "公开" : "私有"}</span><span className={`memory-status ${memory.status}`}>{memory.status === "published" ? "已发布" : "草稿"}</span><span>{formatDate(memory.updated_at)}</span></button>)}{!visibleMemories.length && <div className="memory-empty">还没有匹配的记忆。<br />从右上角新建一条。</div>}</div></section><form className="memory-editor" onSubmit={save}><div className="editor-heading"><div><p className="admin-kicker">{selectedId ? "EDIT MEMORY" : "NEW MEMORY"}</p><h2>{selectedId ? "编辑记忆" : "新建记忆"}</h2></div>{selectedId && <button className="delete-button" type="button" onClick={remove}>删除</button>}</div><label>标题<input value={draft.title} maxLength={160} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：我的工作方式" /></label><div className="editor-grid"><label>分类<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>优先级<input type="number" min={-100} max={100} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} /></label></div><label>标签 <span className="field-hint">用逗号分隔</span><input value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="Next.js, 项目, 工作方式" /></label><label>纯文本内容<textarea value={draft.content} maxLength={12000} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="把处理后的个人信息写在这里…" /><span className="editor-count">{draft.content.length} / 12000</span></label><div className="editor-options"><label className="checkbox-label"><input type="checkbox" checked={draft.visibility === "public"} onChange={(event) => setDraft({ ...draft, visibility: event.target.checked ? "public" : "private" })} />允许公开给访客</label><label>状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Draft["status"] })}><option value="draft">保存为草稿</option><option value="published">立即发布</option></select></label></div>{notice && <p className={`admin-notice ${notice.includes("失败") || notice.includes("不能为空") ? "is-error" : ""}`}>{notice}</p>}<div className="editor-actions"><button className="admin-outline" type="button" onClick={startNew}>清空</button><button className="admin-primary" type="submit" disabled={busy}>{busy ? "保存中…" : draft.status === "published" ? "保存并发布 ↗" : "保存草稿"}</button></div></form></div></section></main>;
}
