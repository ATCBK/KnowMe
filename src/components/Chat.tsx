"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLang } from "@/lib/lang-context";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  name: string;
  title: string;
  location?: string;
  github?: string;
  email?: string;
}

export default function Chat({ name, title, location, github, email }: ChatProps) {
  const { t, lang, setLang } = useLang();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: snapshot };
          return copy;
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(t.chat_error);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const greeting = lang === "zh" ? `你好，我是${name}。` : `Hi, I’m ${name}.`;
  const intro = lang === "zh" ? "这是我的个人 Agent。你可以像面试一样直接问我。" : "This is my personal agent. Ask me anything as if we were in an interview.";
  const sectionTitle = lang === "zh" ? "直接和我聊" : "Talk to me";
  const topLabel = lang === "zh" ? "个人智能名片" : "Personal AI profile";
  const promptLabel = lang === "zh" ? "向我的 Agent 提问，了解我的经历、项目和工作方式。" : "Ask my agent about my experience, projects, and how I work.";
  const startLabel = lang === "zh" ? "从这里开始" : "Start here";

  return (
    <section className="mx-auto min-h-screen w-full max-w-[1380px] px-1 py-6 sm:py-9 lg:px-2">
      <header className="border-b border-[#bcbcbc] pb-4">
        <div className="flex items-center justify-between text-xs font-medium tracking-[0.12em] text-[#9a9a9a] sm:text-sm">
          <span>{topLabel}</span>
          <span className="text-[#222]">KnowMe / 01</span>
        </div>
      </header>

      <div className="pt-12 sm:pt-20 lg:pt-24">
        <div className="flex items-start justify-between gap-5">
          <h1 className="max-w-6xl font-serif text-[clamp(3.4rem,9vw,9.5rem)] font-medium leading-[0.88] tracking-[-0.08em] text-[#202020]">
            <span className="mr-2 italic text-[#333] sm:mr-5">01 /</span>
            <span>{sectionTitle}</span>
            <span className="ml-3 block pl-[0.1em] italic text-[#555] sm:ml-8">{lang === "zh" ? "Direct" : "Immersive"}</span>
          </h1>
          <button
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            className="mt-1 shrink-0 rounded-full border border-[#bdbdbd] px-3 py-1.5 text-xs font-medium text-[#444] transition hover:border-[#ff5b14] hover:text-[#ff5b14] sm:mt-3 sm:px-4"
            aria-label="Switch language"
          >
            {t.lang_switch}
          </button>
        </div>

        <div className="mt-12 max-w-4xl space-y-5 sm:mt-16 sm:space-y-7">
          <p className="text-lg leading-relaxed text-[#222] sm:text-2xl">{title}</p>
          <p className="max-w-3xl text-base leading-7 text-[#444] sm:text-xl sm:leading-8">{intro}</p>
          <p className="max-w-4xl text-base leading-7 sm:text-xl sm:leading-8">
            <span className="mr-2 text-[#777]">Prompt:</span>
            <strong className="font-semibold text-[#ff5b14]">{promptLabel}</strong>
          </p>
        </div>
      </div>

      <div className="relative mt-16 overflow-hidden rounded-[28px] bg-[#1767d2] p-3 shadow-[0_24px_80px_rgba(23,103,210,0.22)] sm:mt-24 sm:rounded-[38px] sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-[#5ea4ff]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-[#08377e]/50 blur-3xl" />

        <div className="relative mb-4 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80 sm:mb-6 sm:px-3 sm:text-xs">
          <span>Open conversation</span>
          <span>Ask / Answer</span>
        </div>

        <div className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[21px] bg-white shadow-[0_18px_50px_rgba(3,34,84,0.25)] sm:min-h-[680px] sm:rounded-[28px]">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-8 sm:py-5">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5b14]" />
              <span className="text-sm font-semibold tracking-tight text-[#222] sm:text-base">{t.chat_title}</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#999] sm:text-xs">{t.chat_disclaimer}</span>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-7 sm:px-8 sm:py-10" aria-live="polite">
            {messages.length === 0 && (
              <div className="max-w-3xl">
                <div className="mb-10 max-w-2xl">
                  <p className="font-serif text-3xl leading-[1.05] tracking-[-0.04em] text-[#222] sm:text-5xl">{greeting}</p>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-[#666] sm:text-base">{intro}</p>
                </div>
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9b9b9b]">{startLabel}</p>
                <div className="flex flex-wrap gap-2.5">
                  {t.chat_suggest.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => void send(suggestion)}
                      className="rounded-full border border-[#cfcfcf] bg-white px-4 py-2.5 text-left text-sm text-[#333] transition hover:-translate-y-0.5 hover:border-[#ff5b14] hover:text-[#ff5b14]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-7 sm:max-w-[76%] ${
                    message.role === "user" ? "rounded-br-md bg-[#1767d2] text-white" : "rounded-bl-md bg-[#f1f1f1] text-[#222]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    message.content ? (
                      <div className="prose prose-sm prose-zinc max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="animate-pulse text-[#888]">{t.chat_thinking}</span>
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-[#d14c2d]">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-black/10 p-3 sm:p-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chat_placeholder}
              disabled={loading}
              aria-label={t.chat_placeholder}
              className="min-w-0 flex-1 rounded-xl border border-[#cfcfcf] bg-white px-4 py-3 text-[15px] text-[#222] outline-none placeholder:text-[#aaa] focus:border-[#1767d2] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-[#ff5b14] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e74b08] disabled:cursor-not-allowed disabled:opacity-35 sm:px-6"
            >
              {t.chat_send}
            </button>
          </form>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-[#999]">
        <div className="flex gap-4">
          {location && <span>{location}</span>}
          {github && <a href={github} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-[#ff5b14]">GitHub</a>}
          {email && <a href={`mailto:${email}`} className="underline underline-offset-4 hover:text-[#ff5b14]">Email</a>}
        </div>
        <span>{name} / KnowMe</span>
      </footer>
    </section>
  );
}
