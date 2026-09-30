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
  const abortRef = useRef<AbortController | null>(null);

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

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: ac.signal,
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
      abortRef.current = null;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const greeting = lang === "zh" ? `你好，我是${name}。` : `Hi, I’m ${name}.`;
  const intro = lang === "zh" ? "这是我的个人 Agent。你可以像面试一样直接问我。" : "This is my personal agent. Ask me anything as if we were in an interview.";

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col py-6 sm:py-10">
      <header className="mb-8 flex items-start justify-between gap-6 sm:mb-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ef6a3a]">Personal agent</p>
          <h1 className="mt-3 font-serif text-4xl leading-none tracking-[-0.04em] text-[#1e1d1b] sm:text-5xl">{name}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#6d6962] sm:text-base">{title}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8c877e]">
            {location && <span>{location}</span>}
            {github && (
              <a href={github} target="_blank" rel="noreferrer" className="underline decoration-[#c9c2b8] underline-offset-4 hover:text-[#ef6a3a]">
                GitHub
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="underline decoration-[#c9c2b8] underline-offset-4 hover:text-[#ef6a3a]">
                Email
              </a>
            )}
          </div>
        </div>

        <button
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="shrink-0 rounded-full border border-[#d8d1c7] bg-[#fffdfa]/70 px-3 py-1.5 text-xs font-medium text-[#6d6962] transition hover:border-[#ef6a3a] hover:text-[#ef6a3a]"
          aria-label="Switch language"
        >
          {t.lang_switch}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-[#ded7cc] bg-[#fffdfa]/90 shadow-[0_24px_80px_rgba(55,45,35,0.09)] backdrop-blur sm:min-h-[600px]">
        <div className="flex items-center justify-between border-b border-[#ebe5dc] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#4f8d76] shadow-[0_0_0_4px_rgba(79,141,118,0.12)]" />
            <span className="text-sm font-semibold text-[#2b2926]">{t.chat_title}</span>
          </div>
          <span className="text-[11px] text-[#999188]">{t.chat_disclaimer}</span>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7 sm:py-8" aria-live="polite">
          {messages.length === 0 && (
            <div className="max-w-2xl">
              <div className="mb-7 max-w-lg">
                <p className="font-serif text-2xl leading-tight tracking-[-0.02em] text-[#2b2926] sm:text-3xl">{greeting}</p>
                <p className="mt-3 text-sm leading-6 text-[#777168]">{intro}</p>
              </div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#aaa298]">{lang === "zh" ? "从这里开始" : "Start here"}</p>
              <div className="flex flex-wrap gap-2">
                {t.chat_suggest.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-[#d9d2c8] bg-[#fffdfa] px-3.5 py-2 text-left text-sm text-[#5f5a53] transition hover:-translate-y-0.5 hover:border-[#ef6a3a] hover:text-[#ef6a3a]"
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
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-7 sm:max-w-[78%] ${
                  message.role === "user" ? "rounded-br-md bg-[#ef6a3a] text-white" : "rounded-bl-md bg-[#f0ede7] text-[#2b2926]"
                }`}
              >
                {message.role === "assistant" ? (
                  message.content ? (
                    <div className="prose prose-sm prose-zinc max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="animate-pulse text-[#8b847b]">{t.chat_thinking}</span>
                  )
                ) : (
                  <span className="whitespace-pre-wrap">{message.content}</span>
                )}
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-[#c4523a]">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 border-t border-[#ebe5dc] p-3 sm:p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat_placeholder}
            disabled={loading}
            aria-label={t.chat_placeholder}
            className="min-w-0 flex-1 rounded-xl border border-[#d9d2c8] bg-[#fffdfa] px-4 py-3 text-[15px] text-[#2b2926] outline-none placeholder:text-[#aaa298] focus:border-[#ef6a3a] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[#1e1d1b] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#3c3935] disabled:cursor-not-allowed disabled:opacity-35 sm:px-5"
          >
            {t.chat_send}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-[11px] text-[#9b958b]">{lang === "zh" ? "基于我的公开资料回答 · 你可以直接开始提问" : "Answers are based on my public profile · Ask anything to get started"}</p>
    </section>
  );
}
