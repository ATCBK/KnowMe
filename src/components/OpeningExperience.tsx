"use client";

import { useEffect, useRef, useState } from "react";
import { CrtBackground } from "@/shaders/crt/CrtBackground";

const VIDEO_SOURCE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";

function MainframeLanding() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const previousXRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

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

  function handleCanPlay() {
    setVideoReady(true);
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

  const links = ["Labs", "Studio", "Openings", "Shop"];

  return (
    <section className="mainframe-home" aria-label="Mainframe creative agency">
      <video
        ref={videoRef}
        className={`mainframe-video ${videoReady ? "is-ready" : ""}`}
        src={VIDEO_SOURCE}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onSeeked={handleSeeked}
        aria-hidden="true"
      />
      <div className="mainframe-wash" aria-hidden="true" />

      <header className="mainframe-nav">
        <nav className="mainframe-desktop-links" aria-label="Main navigation">
          {links.map((link, index) => (
            <span key={link}>
              <a href={`#${link.toLowerCase()}`}>{link}</a>
              {index < links.length - 1 ? ", " : ""}
            </span>
          ))}
        </nav>

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
      </div>

      <main className="mainframe-hero" id="top" aria-label="Video introduction" />
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
          <p className="intro-subtitle">
            你好，这是我的数字孪生体。你可以问它任何你感兴趣的关于我的事情。基于 Agent Harness 工程构建。
          </p>
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
