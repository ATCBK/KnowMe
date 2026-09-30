"use client";

import { useEffect, useRef, useState } from "react";
import { CrtBackground } from "@/shaders/crt/CrtBackground";

const HERO_COPY = "Glad you stopped in. Good taste tends to find us. Now, what are we building?";
const VIDEO_SOURCE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    let interval: number | undefined;
    const delay = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          window.clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(delay);
      if (interval) window.clearInterval(interval);
    };
  }, [speed, startDelay, text]);

  return { displayed, done };
}

function MainframeLanding() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const previousXRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const { displayed, done } = useTypewriter(HERO_COPY);

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setPillsVisible(true), 400);
    return () => window.clearTimeout(revealTimer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

      const previousX = previousXRef.current ?? event.clientX;
      previousXRef.current = event.clientX;
      const delta = event.clientX - previousX;
      const offset = (delta / window.innerWidth) * 0.8 * video.duration;
      const nextTime = Math.min(
        video.duration,
        Math.max(0, targetTimeRef.current + offset),
      );
      targetTimeRef.current = nextTime;

      if (!seekingRef.current) {
        video.currentTime = nextTime;
        seekingRef.current = true;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      previousXRef.current = null;
    };
  }, []);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (video) targetTimeRef.current = video.currentTime;
  }

  function handleSeeked() {
    const video = videoRef.current;
    if (!video) return;
    seekingRef.current = false;
    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.01) {
      video.currentTime = targetTimeRef.current;
      seekingRef.current = true;
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText("hello@mainframe.co");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const links = ["Labs", "Studio", "Openings", "Shop"];

  return (
    <section className="mainframe-home" aria-label="Mainframe creative agency">
      <video
        ref={videoRef}
        className="mainframe-video"
        src={VIDEO_SOURCE}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
        aria-hidden="true"
      />
      <div className="mainframe-wash" aria-hidden="true" />

      <header className="mainframe-nav">
        <a className="mainframe-logo" href="#top" aria-label="Mainframe home">
          <span>Mainframe®</span>
          <span className="mainframe-mark" aria-hidden="true">✳︎</span>
        </a>

        <nav className="mainframe-desktop-links" aria-label="Main navigation">
          {links.map((link, index) => (
            <span key={link}>
              <a href={`#${link.toLowerCase()}`}>{link}</a>
              {index < links.length - 1 ? ", " : ""}
            </span>
          ))}
        </nav>

        <a className="mainframe-contact desktop-contact" href="mailto:hello@mainframe.co">
          Get in touch
        </a>

        <button
          className={`mainframe-menu-button ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div className={`mainframe-mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        {links.map((link) => (
          <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setMenuOpen(false)}>
            {link}
          </a>
        ))}
        <a className="mainframe-contact" href="mailto:hello@mainframe.co" onClick={() => setMenuOpen(false)}>
          Get in touch
        </a>
      </div>

      <main className="mainframe-hero" id="top">
        <div className="mainframe-hero-copy">
          <p className="mainframe-intro" aria-hidden="true">
            Hey there, meet A.R.I.A,<br />
            Mainframe&apos;s Adaptive Response Interface Agent
          </p>
          <p className="mainframe-typewriter" aria-live="polite">
            {displayed}
            {!done && <span className="mainframe-cursor" aria-hidden="true" />}
          </p>
          <div className={`mainframe-pills ${pillsVisible ? "is-visible" : ""}`}>
            <a className="mainframe-pill mainframe-pill-light" href="#idea">Pitch us an idea</a>
            <a className="mainframe-pill mainframe-pill-light" href="#work">Come work here</a>
            <a className="mainframe-pill mainframe-pill-light" href="mailto:hello@mainframe.co">Send a brief hello</a>
            <a className="mainframe-pill mainframe-pill-light" href="#operate">See how we operate</a>
            <button className="mainframe-pill mainframe-pill-outline" type="button" onClick={() => void copyEmail()}>
              <span>Reach us: <u>hello@mainframe.co</u>{copied ? " · copied" : ""}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="5" y="2" width="8" height="9" rx="1" />
                <rect x="2" y="5" width="8" height="9" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </section>
  );
}

export default function OpeningExperience() {
  const [entered, setEntered] = useState(false);

  return (
    <div className={`experience-shell ${entered ? "is-entered" : ""}`}>
      <div className="shader-frame" aria-hidden="true">
        <CrtBackground
          variant="blue-screen"
          speed={1.00}
          motion={1.00}
          hue={0}
          saturation={1.00}
          brightness={1.00}
          opacity={1.00}
        />
      </div>

      <div className="intro-screen" data-entered={entered}>
        <div className="intro-copy">
          <p className="intro-kicker">Personal interview uplink / 01</p>
          <h1 className="intro-title">KnowMe</h1>
          <p className="intro-subtitle">Resume distilled into a conversation</p>
          <button className="intro-skip" type="button" onClick={() => setEntered(true)}>
            Enter conversation →
          </button>
        </div>
      </div>

      <div className="page-transition" aria-hidden="true" />
      <main className="mainframe-stage" data-ready={entered}>
        {entered && <MainframeLanding />}
      </main>
    </div>
  );
}
