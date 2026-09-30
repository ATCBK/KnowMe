export type Lang = "zh" | "en";

export const dict = {
  zh: {
    nav_home: "首页",
    nav_blog: "博客",
    nav_resume: "简历",
    nav_chat: "对话",
    hero_hint: "这个网站有一个了解我全部背景的 AI，你可以直接问它。",
    chat_title: "和我聊聊",
    chat_placeholder: "问我任何问题，比如：你最有代表性的项目是什么？",
    chat_send: "发送",
    chat_thinking: "思考中…",
    chat_error: "出错了，请稍后再试。",
    chat_disclaimer: "这是一个基于我公开资料的 AI Agent，回答仅供参考。",
    chat_suggest: ["介绍一下你自己", "你最有代表性的项目？", "你在找什么样的工作？", "你的技术栈是什么？"],
    blog_title: "博客",
    blog_empty: "还没有文章。",
    resume_updated: "更新于",
    footer: "由 KnowMe 驱动 · 源码在",
    lang_switch: "EN",
  },
  en: {
    nav_home: "Home",
    nav_blog: "Blog",
    nav_resume: "Résumé",
    nav_chat: "Chat",
    hero_hint: "This site has an AI that knows my full background. Just ask it.",
    chat_title: "Chat with me",
    chat_placeholder: "Ask me anything, e.g. what's your most representative project?",
    chat_send: "Send",
    chat_thinking: "Thinking…",
    chat_error: "Something went wrong. Please try again.",
    chat_disclaimer: "An AI agent built from my public writing. Answers are for reference only.",
    chat_suggest: ["Tell me about yourself", "Your most representative project?", "What role are you looking for?", "What's your tech stack?"],
    blog_title: "Blog",
    blog_empty: "No posts yet.",
    resume_updated: "Updated",
    footer: "Powered by KnowMe · source on",
    lang_switch: "中文",
  },
} as const;

export type Dict = (typeof dict)[Lang];
