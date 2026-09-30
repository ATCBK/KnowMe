# KnowMe

> 一个给面试官使用的个人 AI Agent 入口。

KnowMe 不是复杂的个人网站，而是一个可以直接提问的单页 Agent。访客打开页面后，可以像面试一样询问我的经历、项目、能力和求职方向，Agent 会基于我的公开资料自动回答。

## How it works

```
content/profile.md   ← 我的身份、表达方式和个人背景
content/resume.md    ← 我的经历、项目和技能
content/posts/*.md   ← 可补充的公开文章和思考
src/app/api/chat     ← 读取这些内容并调用 OpenAI-compatible LLM
```

页面只有一个入口：`/`。旧的博客、简历和对话地址会自动回到首页。

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>，即可进入 Agent 页面。

## Environment variables

在 `.env.local` 中配置：

```bash
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=1024
```

支持任意 OpenAI-compatible 服务，例如 DeepSeek、通义千问、智谱和 Moonshot。

## Customize

只需要编辑 `content/profile.md` 和 `content/resume.md`，Agent 的回答内容就会随之更新。不要把不适合公开的信息写入这些文件，因为仓库是公开的。

## Deploy

可以直接导入 Vercel，并在项目设置中配置同名环境变量。

## Stack

Next.js 15 · TypeScript · Tailwind CSS · OpenAI-compatible LLM · Vercel
