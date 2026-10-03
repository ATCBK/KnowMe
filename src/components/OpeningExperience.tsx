"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { CrtBackground } from "@/shaders/crt/CrtBackground";
import { siteProfile } from "@/lib/profile";

type Message = { role: "user" | "assistant"; content: string };
type Bubble = { id: number; text: string; tone: "welcome" | "answer" | "error"; anchor: number };
const MAX_VISIBLE_REPLY_CHARS = 30;

const CONFIG = {
  placeholder: "想了解我什么？从这里开始聊聊…",
  suggestions: ["最近在折腾什么？", "你做过哪些有意思的东西？", "遇到一个新想法，你一般怎么判断值不值得做？"],
  maxBubbles: 1,
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

function shortenBubbleText(source: string) {
  const text = source.replace(/\s+/g, " ").replace(/\*\*/g, "").trim();
  if (text.length <= MAX_VISIBLE_REPLY_CHARS) return text;
  const sentenceEnd = text.search(/[。！？!?；;]/);
  if (sentenceEnd >= 0 && sentenceEnd < MAX_VISIBLE_REPLY_CHARS) return text.slice(0, sentenceEnd + 1);
  return `${text.slice(0, MAX_VISIBLE_REPLY_CHARS - 1).trimEnd()}…`;
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

type ProfilePanel = "about" | "projects" | "skills" | "resume" | "contact";
const PANEL_TITLES: Record<ProfilePanel, string> = {
  about: "认识一下我。", projects: "做过的东西。", skills: "我的工具箱。", resume: "我的简历。", contact: "保持联系。",
};

function LeftContext({ onChat, onContact }: { onChat: () => void; onContact: () => void }) {
  return (
    <section className="left-context" aria-label="个人介绍">
      <div className="intro-copy-block">
        <h1><span>Hi, I’m</span><span className="intro-name">{siteProfile.displayName}<span className="name-period">.</span></span></h1>
        <p className="personal-description">{siteProfile.introduction}<br />{siteProfile.invitation}</p>
      </div>
      <div className="intro-actions">
        <p>想再多了解我一点？</p>
        <div className="intro-action-links">
          <button className="intro-contact" type="button" onClick={onContact}><span className="action-avatar" aria-hidden="true">↗</span><span><strong>联系我</strong><small>直接和我聊聊</small></span></button>
          <span className="action-or">或</span>
          <button className="intro-contact" type="button" onClick={onChat}><span className="action-avatar agent-avatar" aria-hidden="true">✳</span><span><strong>和分身聊聊</strong><small>一个了解我的 AI 朋友</small></span></button>
        </div>
      </div>
    </section>
  );
}

function ProfileDetails({ panel, onClose, onQuestion }: { panel: ProfilePanel | null; onClose: () => void; onQuestion: (question: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel && !dialog.open) dialog.showModal();
    if (!panel && dialog.open) dialog.close();
  }, [panel]);

  return <dialog ref={dialogRef} className="profile-dialog" aria-labelledby="profile-dialog-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {panel && <div className="profile-dialog-content">
      <div className="panel-heading"><span className="panel-kicker">A LITTLE MORE ABOUT ME</span><button className="panel-close" type="button" aria-label="关闭资料" onClick={onClose}>×</button></div>
      <h2 id="profile-dialog-title">{PANEL_TITLES[panel]}</h2>
      {panel === "about" && <><p>{siteProfile.about}</p><button className="panel-question" type="button" onClick={() => onQuestion("请简单介绍一下你自己。")}>让分身介绍一下我 <span>↗</span></button></>}
      {panel === "projects" && <>{siteProfile.projects.map((project) => <article className="project-entry" key={project.name}><p className="project-category">{project.category}</p><h3>{project.name}</h3><p>{project.description}</p><span className="project-technologies">{project.technologies}</span></article>)}<button className="panel-question" type="button" onClick={() => onQuestion("介绍一下 KnowMe 这个项目和它的技术选择。")}>聊聊这个项目 <span>↗</span></button></>}
      {panel === "skills" && <>{siteProfile.skills.length ? <ul className="skill-list">{siteProfile.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p>我的技能介绍还在整理中。你可以先看看这个网站，或者问问我的分身。</p>}<button className="panel-question" type="button" onClick={() => onQuestion("这个网站用了什么技术？")}>聊聊技术与工作方式 <span>↗</span></button></>}
      {panel === "resume" && <>{siteProfile.resumeUrl ? <><p>想完整了解我的经历？可以下载我的简历，慢慢看。</p><a className="panel-question" href={siteProfile.resumeUrl} download target="_blank" rel="noopener noreferrer">下载简历 <span>↓</span></a></> : <><p>简历正在整理，暂时还没有可下载的版本。</p><p className="panel-secondary">你可以先了解我的项目，或和我的分身聊聊。</p><button className="panel-question" type="button" onClick={() => onQuestion("我想了解你的公开经历。")}>先聊聊我的经历 <span>↗</span></button></>}</>}
      {panel === "contact" && <>{siteProfile.email ? <><p>关于工作、项目，或者一个有趣的想法，都欢迎来聊。</p><a className="panel-question" href={`mailto:${siteProfile.email}`}>{siteProfile.email} <span>↗</span></a></> : <><p>联系方式还没有公开。你可以先留下想聊的话题，和我的 AI 分身开始一次对话。</p><button className="panel-question" type="button" onClick={() => { onClose(); document.querySelector<HTMLTextAreaElement>(".chat-form textarea")?.focus(); }}>开始聊聊 <span>↗</span></button></>}</>}
    </div>}
  </dialog>;
}

function BubbleLayer({ bubbles, hidden }: { bubbles: Bubble[]; hidden: boolean }) {
  if (hidden) return null;
  return (
    <div className="bubble-layer" aria-live="polite" aria-atomic="false">
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
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [error, setError] = useState("");
  const [materialVisible, setMaterialVisible] = useState(false);
  const [profilePanel, setProfilePanel] = useState<ProfilePanel | null>(null);
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

  const updateAnswerBubble = useCallback((text: string, anchor: number) => {
    if (!mountedRef.current) return;
    setBubbles((current) => {
      const last = current.at(-1);
      if (last?.tone === "answer") {
        return [...current.slice(0, -1), { ...last, text }];
      }
      return [{ id: bubbleIdRef.current++, text, tone: "answer" as const, anchor }].slice(-CONFIG.maxBubbles);
    });
  }, []);

  const stopCurrent = useCallback(() => {
    turnRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
  }, []);

  const sendQuestion = useCallback(async (rawQuestion: string, retry = false) => {
    const question = rawQuestion.trim();
    if (!question || (busy && !retry)) return;
    stopCurrent();
    const turn = turnRef.current;
    const answerAnchor = turn % 3;
    const controller = new AbortController();
    controllerRef.current = controller;
    setInput("");
    setStarted(true);
    setCurrentQuestion(question);
    setError("");
    setMaterialVisible(/项目|作品|做过|资料/.test(question));
    setBubbles([]);
    setBusy(true);
    const nextHistory = retry ? historyRef.current : [...historyRef.current, { role: "user" as const, content: question }];
    historyRef.current = nextHistory;
    try {
      let answer = "";
      const stream = realStream(nextHistory, controller.signal);
      for await (const chunk of stream) {
        if (turnRef.current !== turn) return;
        answer += chunk;
        const shortAnswer = shortenBubbleText(answer);
        if (shortAnswer) updateAnswerBubble(shortAnswer, answerAnchor);
      }
      if (!answer.trim()) throw new Error("Agent returned an empty response.");
      if (historyRef.current.at(-1)?.role !== "assistant") historyRef.current = [...historyRef.current, { role: "assistant", content: answer.trim() }];
      if (turnRef.current === turn) setBusy(false);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      if (turnRef.current !== turn) return;
      setBusy(false);
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
      <LeftContext onChat={() => { setStarted(true); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".chat-form textarea")?.focus()); }} onContact={() => setProfilePanel("contact")} />
      <ProfileDetails panel={profilePanel} onClose={() => setProfilePanel(null)} onQuestion={(question) => { setProfilePanel(null); sendQuestion(question); }} />
      <BubbleLayer bubbles={bubbles} hidden={input.trim().length > 0} />
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
