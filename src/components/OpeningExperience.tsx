"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { CrtBackground } from "@/shaders/crt/CrtBackground";

type Message = { role: "user" | "assistant"; content: string };
type Bubble = { id: number; text: string; tone: "welcome" | "answer" | "error"; anchor: number };

const CONFIG = {
  welcome: "你好，想从哪儿聊起？",
  placeholder: "有什么想问我的吗？",
  suggestions: ["最近在折腾什么？", "你做过哪些有意思的东西？", "遇到一个新想法，你一般怎么判断值不值得做？"],
  maxBubbles: 3,
  maxInputLines: 3,
} as const;

async function* realStream(messages: Message[], signal: AbortSignal) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!response.ok) {
    const reason = await response.text();
    if (response.status === 503) throw new Error("智能体还没有配置，请先补充 Agent 的连接信息。");
    throw new Error(reason || "智能体暂时无法回复。");
  }
  if (!response.body) throw new Error("Agent 没有返回可读内容。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) yield chunk;
  }
  const rest = decoder.decode();
  if (rest) yield rest;
}

function BackgroundAndCompanion() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const previousXRef = useRef<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const previousX = previousXRef.current ?? event.clientX;
      previousXRef.current = event.clientX;
      const delta = event.clientX - previousX;
      targetTimeRef.current = Math.min(video.duration, Math.max(0, targetTimeRef.current + (delta / window.innerWidth) * 0.8 * video.duration));
      if (!seekingRef.current) { video.currentTime = targetTimeRef.current; seekingRef.current = true; }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => { window.removeEventListener("mousemove", handleMouseMove); previousXRef.current = null; };
  }, []);

  return <div className="companion-background" aria-hidden="true">
    <video ref={videoRef} className={`companion-video ${videoReady ? "is-ready" : ""}`} src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4" muted playsInline preload="auto" onLoadedMetadata={() => { setVideoReady(true); if (videoRef.current) targetTimeRef.current = videoRef.current.currentTime; }} onCanPlay={() => setVideoReady(true)} onSeeked={() => { seekingRef.current = false; if (videoRef.current && Math.abs(videoRef.current.currentTime - targetTimeRef.current) > 0.01) { videoRef.current.currentTime = targetTimeRef.current; seekingRef.current = true; } }} />
    <div className="companion-wash" />
    <div className="background-grain" />
  </div>;
}

function LeftContext({ started, currentQuestion, onSuggestion, materialVisible, onBackToIntro }: {
  started: boolean;
  currentQuestion: string;
  onSuggestion: (question: string) => void;
  materialVisible: boolean;
  onBackToIntro: () => void;
}) {
  const showMaterial = materialVisible && started;
  return (
    <section className={`left-context ${started ? "is-started" : ""}`} aria-live="polite">
      {showMaterial ? (
        <div className="material-view">
          <button className="back-link" type="button" onClick={onBackToIntro}>← 返回介绍</button>
          <p className="context-label">当前话题</p>
          <h2>{currentQuestion}</h2>
          <p className="material-copy">这里会显示与话题对应的公开项目或笔记。当前仓库还没有可展示的真实项目素材，回答仍会照常进行。</p>
          <div className="material-placeholder" aria-label="暂无公开项目素材"><span>资料素材待补充</span></div>
        </div>
      ) : (
        <div className="intro-context">
          <div className="intro-copy-block">
            <h1>关于我，问它。</h1>
            <p>这是我的 AI 分身。<br />我的经历、做过的东西，还有一些想法，都可以和它聊。</p>
          </div>
          <div className="suggestions" aria-label="推荐问题">
            {CONFIG.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => onSuggestion(suggestion)}>{suggestion}<span>↗</span></button>)}
          </div>
          {started && <p className="context-status">正在聊：{currentQuestion}</p>}
        </div>
      )}
    </section>
  );
}

function BubbleLayer({ bubbles, waiting }: { bubbles: Bubble[]; waiting: boolean }) {
  return (
    <div className="bubble-layer" aria-live="polite" aria-atomic="false">
      {waiting && <div className="answer-bubble waiting-bubble" role="status" aria-label="正在等待回复"><span /><span /><span /></div>}
      {bubbles.map((bubble) => <div key={bubble.id} className={`answer-bubble ${bubble.tone === "welcome" ? "welcome-bubble" : ""} ${bubble.tone === "error" ? "error-bubble" : ""} bubble-anchor-${bubble.anchor}`} role={bubble.tone === "answer" ? "status" : undefined}>{bubble.text}</div>)}
    </div>
  );
}

function ChatInput({ value, busy, currentQuestion, error, onChange, onSubmit, onStop, onRetry }: {
  value: string;
  busy: boolean;
  currentQuestion: string;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onRetry: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 76)}px`;
  }, []);
  useEffect(resize, [value, resize]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (!busy) onSubmit();
  }

  return (
    <div className="input-dock">
      {currentQuestion && <p className="question-echo">本轮提问：{currentQuestion}</p>}
      {error && <div className="error-row"><span>{error}</span><button type="button" onClick={onRetry}>重试</button></div>}
      <form className="chat-form" onSubmit={(event: FormEvent) => { event.preventDefault(); if (busy) onStop(); else onSubmit(); }}>
        <textarea ref={textareaRef} value={value} rows={1} maxLength={1000} placeholder={CONFIG.placeholder} aria-label={CONFIG.placeholder} onChange={(event) => onChange(event.target.value)} onKeyDown={handleKeyDown} />
        <button className={`send-button ${busy ? "is-stop" : ""}`} type="submit" aria-label={busy ? "停止回复" : "发送问题"}>{busy ? <span className="stop-icon" /> : <span className="send-icon">↗</span>}</button>
      </form>
      <p className="mode-note">公开资料空间 · 只展示允许分享的内容</p>
    </div>
  );
}

function KnowMeChat() {
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([{ id: 0, text: CONFIG.welcome, tone: "welcome", anchor: 0 }]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [error, setError] = useState("");
  const [materialVisible, setMaterialVisible] = useState(false);
  const historyRef = useRef<Message[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const turnRef = useRef(0);
  const bubbleIdRef = useRef(1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const pushBubble = useCallback((text: string, tone: Bubble["tone"] = "answer") => {
    if (!mountedRef.current) return;
    setBubbles((current) => [...current, { id: bubbleIdRef.current++, text, tone, anchor: tone === "answer" ? (bubbleIdRef.current - 1) % 3 : 0 }].slice(-CONFIG.maxBubbles));
  }, []);

  const updateAnswerBubble = useCallback((text: string) => {
    if (!mountedRef.current) return;
    setBubbles((current) => {
      const last = current.at(-1);
      if (last?.tone === "answer") {
        return [...current.slice(0, -1), { ...last, text }];
      }
      return [...current, { id: bubbleIdRef.current++, text, tone: "answer" as const, anchor: (bubbleIdRef.current - 1) % 3 }].slice(-CONFIG.maxBubbles);
    });
  }, []);

  const stopCurrent = useCallback(() => {
    turnRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
    setWaiting(false);
  }, []);

  const sendQuestion = useCallback(async (rawQuestion: string, retry = false) => {
    const question = rawQuestion.trim();
    if (!question || (busy && !retry)) return;
    stopCurrent();
    const turn = turnRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setInput("");
    setStarted(true);
    setCurrentQuestion(question);
    setError("");
    setMaterialVisible(/项目|作品|做过|资料/.test(question));
    setBubbles([]);
    setBusy(true);
    setWaiting(true);
    const nextHistory = retry ? historyRef.current : [...historyRef.current, { role: "user" as const, content: question }];
    historyRef.current = nextHistory;
    try {
      let answer = "";
      const stream = realStream(nextHistory, controller.signal);
      for await (const chunk of stream) {
        if (turnRef.current !== turn) return;
        answer += chunk;
        setWaiting(false);
        updateAnswerBubble(answer);
      }
      if (!answer.trim()) throw new Error("Agent returned an empty response.");
      if (historyRef.current.at(-1)?.role !== "assistant") historyRef.current = [...historyRef.current, { role: "assistant", content: answer.trim() }];
      if (turnRef.current === turn) { setBusy(false); setWaiting(false); }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      if (turnRef.current !== turn) return;
      setBusy(false);
      setWaiting(false);
      const message = reason instanceof Error ? reason.message : "这次回复没有完成，可以再试一次。";
      setError(message);
      pushBubble("刚才没有连上，等你再问我一次。", "error");
    }
  }, [busy, pushBubble, stopCurrent, updateAnswerBubble]);

  const retry = useCallback(() => sendQuestion(currentQuestion, true), [currentQuestion, sendQuestion]);

  return (
    <main className={`knowme-shell ${started ? "is-started" : ""}`}>
      <BackgroundAndCompanion />
      <div className="brand-mark" aria-label="KnowMe">knowme<span>↗</span></div>
      <LeftContext started={started} currentQuestion={currentQuestion} onSuggestion={sendQuestion} materialVisible={materialVisible} onBackToIntro={() => setMaterialVisible(false)} />
      <BubbleLayer bubbles={bubbles} waiting={waiting} />
      <div className="companion-caption" aria-hidden="true">a little more like me</div>
      <ChatInput value={input} busy={busy} currentQuestion={currentQuestion} error={error} onChange={setInput} onSubmit={() => sendQuestion(input)} onStop={stopCurrent} onRetry={retry} />
    </main>
  );
}

export default function OpeningExperience() {
  const [entered, setEntered] = useState(false);
  return (
    <div className={`experience-shell ${entered ? "is-entered" : ""}`}>
      <div className="shader-frame" aria-hidden="true">
        <CrtBackground variant="blue-screen" speed={1} motion={1} hue={0} saturation={1} brightness={1} opacity={1} />
      </div>
      <div className="intro-screen" data-entered={entered}>
        <div className="intro-copy">
          <p className="intro-kicker">Personal interview uplink / 01</p>
          <h1 className="intro-title">KnowMe</h1>
          <p className="intro-subtitle">你好，这是我的数字孪生体。你可以问它任何你感兴趣的关于我的事情。基于 Agent Harness 工程构建。</p>
          <button className="intro-skip" type="button" onClick={() => setEntered(true)}>Enter conversation →</button>
        </div>
      </div>
      <div className="page-transition" aria-hidden="true" />
      <main className="mainframe-stage" data-ready={entered}>{entered && <KnowMeChat />}</main>
    </div>
  );
}
