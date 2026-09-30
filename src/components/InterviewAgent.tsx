"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CrtBackground } from "@/shaders/crt/CrtBackground";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = ["请用 30 秒介绍一下你自己", "你最有代表性的项目是什么？", "你擅长什么？"];

export default function InterviewAgent() {
  const [entered, setEntered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 3600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const snapshot = answer;
        setMessages((current) => [...current.slice(0, -1), { role: "assistant", content: snapshot }]);
      }
    } catch {
      setMessages((current) => current.slice(0, -1));
      setError("暂时无法连接 Agent，请先配置 LLM_API_KEY。");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="app-shell">
      <div className="shader-frame" aria-hidden="true">
        <CrtBackground variant="blue-screen" speed={1.0} motion={1.0} hue={0} saturation={1.0} brightness={1.0} opacity={1.0} />
      </div>

      <div className="intro-screen" data-entered={entered}>
        <div className="intro-copy">
          <p className="intro-kicker">Personal interview uplink / 01</p>
          <h1 className="intro-title">KnowMe</h1>
          <p className="intro-subtitle">Resume distilled into a conversation</p>
          <button className="intro-skip" onClick={() => setEntered(true)}>Enter conversation →</button>
        </div>
      </div>

      <main className="agent-layer" data-ready={entered}>
        <section className="agent-card" aria-label="Personal interview agent">
          <header className="agent-header">
            <div>
              <p className="agent-eyebrow">Personal agent / interview mode</p>
              <h2 className="agent-name">你的名字 / Your Name</h2>
              <p className="agent-title">一个可以直接提问的个人简历 Agent。请把自己的资料写进 <code>src/lib/profile.ts</code>。</p>
            </div>
            <span className="agent-toggle" aria-label="Current language">ZH / EN</span>
          </header>

          <div className="agent-status"><span className="agent-status-dot" /> Knowledge uplink ready</div>

          <div className="chat-messages" aria-live="polite">
            {messages.length === 0 && (
              <div className="chat-empty">
                <h3 className="chat-empty-title">先问我一个问题。</h3>
                <p className="chat-empty-copy">不用翻阅整份简历，直接了解我的经历、项目、技术选择和工作方式。</p>
                <div className="chat-suggestions">
                  {suggestions.map((suggestion) => <button className="chat-suggestion" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div className="chat-row" data-role={message.role} key={`${message.role}-${index}`}>
                <div className="chat-bubble">{message.content || (loading ? "Thinking…" : "")}</div>
              </div>
            ))}
            {error && <p className="chat-error">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <form className="chat-form" onSubmit={submit}>
            <input className="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="直接输入问题，例如：你为什么适合这个岗位？" disabled={loading} aria-label="Ask the personal agent" />
            <button className="chat-send" type="submit" disabled={loading || !input.trim()}>Send</button>
          </form>
        </section>
        <p className="agent-footer">Ask anything · answers are grounded in the profile you provide</p>
      </main>
    </div>
  );
}
