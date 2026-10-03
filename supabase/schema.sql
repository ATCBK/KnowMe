create table if not exists public.memory_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'other',
  tags text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_documents_updated_at_idx on public.memory_documents (updated_at desc);
create index if not exists memory_documents_status_visibility_idx on public.memory_documents (status, visibility);

alter table public.memory_documents enable row level security;

revoke all on public.memory_documents from anon, authenticated;
grant all on public.memory_documents to service_role;

create or replace function public.set_memory_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memory_documents_updated_at on public.memory_documents;
create trigger memory_documents_updated_at
before update on public.memory_documents
for each row execute function public.set_memory_documents_updated_at();

insert into public.memory_documents (title, content, category, tags, visibility, status, priority)
values (
  'KnowMe 项目',
  'KnowMe 是我的个人 AI 分身网站，目标是让访客通过对话了解我的经历、项目和思考方式。当前网站使用 Next.js、React 和 TypeScript，Agent 接口兼容 OpenAI Chat Completions 格式。',
  'project',
  array['KnowMe', 'AI Agent', 'Next.js', 'React', 'TypeScript'],
  'public',
  'published',
  10
)
on conflict do nothing;
