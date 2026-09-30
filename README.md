# KnowMe

> A personal site that is also a conversation. Visitors read my blog **and** chat with an AI agent that carries my full context — résumé, projects, writing, and how I think.

个人博客 + 一个「懂我」的 AI Agent。访客可以直接和它对话，快速了解我。

## How it works

```
content/           ← everything the agent knows, in Markdown
├── profile.md     ← who I am, how I talk, what I care about  (agent core)
├── resume.md      ← résumé                                    (agent + /resume page)
└── posts/*.md     ← blog posts                                (agent + /blog)

src/app/api/chat   ← streams replies from any OpenAI-compatible LLM
```

The same Markdown files render the website **and** are compiled into the agent's system prompt at request time. Edit one file, both update.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your LLM key
npm run dev                  # http://localhost:3000
```

## Deploy (Vercel)

1. Import this repo on [vercel.com/new](https://vercel.com/new).
2. Add env vars `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (see `.env.example`).
3. Deploy. Done.

## Customize

- Replace the placeholders in `content/profile.md` and `content/resume.md`.
- Add posts under `content/posts/` with frontmatter `title`, `date`, `summary`, `lang` (`zh` | `en`).
- Site-wide strings live in `src/lib/i18n.ts`.

## Privacy note

This repo is public. Keep anything you wouldn't put on a public résumé out of `content/`.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · any OpenAI-compatible LLM (DeepSeek / Qwen / GLM / …) · Vercel
