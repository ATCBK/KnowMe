export type Lang = "zh" | "en";

export const dict = {
  zh: {
    nav_home: "首页",
    nav_blog: "博客",
    nav_resume: "简历",
    nav_chat: "对话",
    hero_hint: "这是我的个人 Agent，你可以像面试一样直接问我。",
    chat_title: "直接问我",
    chat_placeholder: "直接输入问题，例如：你为什么适合这个岗位？",
    chat_send: "发送",
    chat_thinking: "思考中…",
    chat_error: "出错了，请稍后再试。",
    chat_disclaimer: "基于公开资料",
    chat_suggest: ["请用 30 秒介绍一下你自己", "你做过最有代表性的项目？", "你擅长什么？", "你正在寻找什么机会？"],
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
    hero_hint: "This is my personal agent. Ask me anything as if we were in an interview.",
    chat_title: "Ask me directly",
    chat_placeholder: "Ask a question, e.g. why are you a fit for this role?",
    chat_send: "Send",
    chat_thinking: "Thinking…",
    chat_error: "Something went wrong. Please try again.",
    chat_disclaimer: "Based on public profile",
    chat_suggest: ["Give me your 30-second introduction", "What's your most representative project?", "What are you good at?", "What opportunity are you looking for?"],
    blog_title: "Blog",
    blog_empty: "No posts yet.",
    resume_updated: "Updated",
    footer: "Powered by KnowMe · source on",
    lang_switch: "中文",
  },
} as const;

export type Dict = (typeof dict)[Lang];
