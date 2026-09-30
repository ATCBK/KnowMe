---
title: "Why I built a résumé you can talk to"
date: "2026-09-29"
summary: "A one-page résumé can only be read. I wanted one that can be asked."
lang: "en"
---

A résumé is one-directional. Recruiters see the information I chose to compress onto a page, while the questions they actually care about — *what exactly did you solve in that project? why that design?* — have to wait for an interview.

So I built KnowMe. It's my blog, and it's an agent: my résumé, projects and writing are all fed to the model as context, and anyone who opens the site can just ask.

## How it works

- Everything is Markdown in the repo. Edit one file and both the blog page and the agent's knowledge update.
- The backend is a thin streaming proxy to any OpenAI-compatible model.
- Deployed on Vercel, zero ops.

## Next

I'll post project retrospectives and notes here. If any part of my background interests you, ask the agent.
