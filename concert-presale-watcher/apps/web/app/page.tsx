"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import styles from "./landing.module.css";

// ── Asset URLs ──────────────────────────────────────────────────────────────
const PROCESS_HLS =
  "https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8";
const STATS_HLS =
  "https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8";
const CTA_HLS =
  "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

const SOURCES = ["Ticketmaster", "Eventbrite", "Songkick", "Bandsintown", "AXS", "DICE"];

// ── Icons ───────────────────────────────────────────────────────────────────
function ArrowUpRight({ size = 14, stroke = 1.5 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}
function ZapIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function RadarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <line x1="12" y1="12" x2="20" y2="6" />
    </svg>
  );
}
function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
function ListIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1.2" fill="currentColor" />
      <circle cx="4" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}
function MenuIcon({ open, size = 18 }: { open: boolean; size?: number }) {
  return open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

// ── Animation primitives ────────────────────────────────────────────────────
interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
  splitBy?: "word" | "char";
}

function BlurText({
  text,
  delay = 80,
  className = "",
  as: As = "h1",
  style = {},
  splitBy = "word",
}: BlurTextProps) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el]);

  const parts = splitBy === "word" ? text.split(/(\s+)/) : text.split("");
  const Tag = As as React.ElementType;

  return (
    <Tag
      ref={(node: HTMLElement | null) => setEl(node)}
      className={className}
      style={style}
      aria-label={text}
    >
      {parts.map((p, i) => {
        if (/^\s+$/.test(p)) return <span key={i}>{p}</span>;
        const d = (i * delay) / 1000;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              filter: visible ? "blur(0px)" : "blur(10px)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(40px)",
              transition: `filter 700ms cubic-bezier(0.2,0.7,0.2,1) ${d}s, opacity 700ms cubic-bezier(0.2,0.7,0.2,1) ${d}s, transform 700ms cubic-bezier(0.2,0.7,0.2,1) ${d}s`,
              willChange: "filter, opacity, transform",
            }}
          >
            {p}
          </span>
        );
      })}
    </Tag>
  );
}

interface BlurInProps {
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

function BlurIn({ delay = 0, children, style = {}, className = "" }: BlurInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        filter: visible ? "blur(0px)" : "blur(10px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `filter 600ms ease ${delay}s, opacity 600ms ease ${delay}s, transform 600ms ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ── HLS video ───────────────────────────────────────────────────────────────
function useHls(src: string) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    let hlsInstance: Hls | undefined;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
    } else if (Hls.isSupported()) {
      hlsInstance = new Hls({ enableWorker: false });
      hlsInstance.loadSource(src);
      hlsInstance.attachMedia(v);
    } else {
      v.src = src;
    }
    return () => {
      if (hlsInstance) hlsInstance.destroy();
    };
  }, [src]);
  return ref;
}

function HlsVideo({
  src,
  className,
  saturate = 1,
}: {
  src: string;
  className?: string;
  saturate?: number;
}) {
  const ref = useHls(src);
  return (
    <video
      ref={ref}
      className={className ?? styles.videoBg}
      autoPlay
      loop
      muted
      playsInline
      style={{ filter: saturate === 1 ? "none" : `saturate(${saturate})` }}
    />
  );
}

// ── Watchlist mockup (Coverage feature) ─────────────────────────────────────
function WatchlistMock() {
  const rows = [
    { artist: "Geese", venue: "Bowery Ballroom · NYC", status: "WATCHING", tone: "ok" as const },
    { artist: "MJ Lenderman", venue: "The Echo · Los Angeles", status: "ON SALE", tone: "live" as const },
    { artist: "Wednesday", venue: "Lincoln Hall · Chicago", status: "PRESALE FRI", tone: "warn" as const },
    { artist: "Hotline TNT", venue: "Empty Bottle · Chicago", status: "WATCHING", tone: "ok" as const },
    { artist: "Slow Pulp", venue: "9:30 Club · DC", status: "+2 DATES", tone: "new" as const },
  ];
  const tones: Record<string, string> = {
    ok: "rgba(255,255,255,0.55)",
    live: "#65d28b",
    warn: "#f5b46a",
    new: "#9bb8ff",
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background:
          "radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.06), transparent 60%), #0a0a0b",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div className={styles.eyebrow} style={{ fontSize: 9 }}>
          YOUR WATCHLIST
        </div>
        <div className={styles.tiny} style={{ color: "rgba(255,255,255,0.4)" }}>
          5 ARTISTS · 12 CITIES
        </div>
      </div>
      {rows.map((r) => (
        <div
          key={r.artist}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 14px",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className={styles.fontHeading} style={{ fontSize: 18, lineHeight: 1 }}>
              {r.artist}
            </div>
            <div className={styles.tiny} style={{ marginTop: 4, color: "rgba(255,255,255,0.55)" }}>
              {r.venue}
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: tones[r.tone],
              padding: "4px 8px",
              borderRadius: 999,
              border: `1px solid ${tones[r.tone]}33`,
              background: `${tones[r.tone]}10`,
              whiteSpace: "nowrap",
            }}
          >
            {r.status}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Alert feed mockup (Detection feature) ───────────────────────────────────
function AlertFeedMock() {
  const items = [
    {
      kind: "STATUS FLIP",
      tone: "#f5b46a",
      artist: "MJ Lenderman",
      where: "The Echo · Los Angeles",
      time: "12 sec ago",
      detail: "Ticketmaster moved to ON SALE",
    },
    {
      kind: "NEW DATE",
      tone: "#9bb8ff",
      artist: "Slow Pulp",
      where: "9:30 Club · Washington DC",
      time: "4 min ago",
      detail: "Songkick listed 2 added shows in your radius",
    },
    {
      kind: "PRESALE OPEN",
      tone: "#65d28b",
      artist: "Wednesday",
      where: "Lincoln Hall · Chicago",
      time: "2 hr ago",
      detail: "Code MAGNOLIA accepted on AXS",
    },
  ];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background:
          "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.06), transparent 60%), #0a0a0b",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div className={styles.eyebrow} style={{ fontSize: 9 }}>
          LIVE FEED
        </div>
        <div
          className={styles.tiny}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)" }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "#65d28b",
              display: "inline-block",
            }}
          />
          POLLING · EVERY 60s
        </div>
      </div>
      {items.map((it) => (
        <div
          key={it.artist}
          style={{
            padding: "12px 14px",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.18em",
                color: it.tone,
              }}
            >
              {it.kind}
            </div>
            <div className={styles.tiny} style={{ color: "rgba(255,255,255,0.4)" }}>
              {it.time}
            </div>
          </div>
          <div className={styles.fontHeading} style={{ fontSize: 20, lineHeight: 1, marginTop: 6 }}>
            {it.artist}
          </div>
          <div className={styles.tiny} style={{ color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
            {it.where}
          </div>
          <div className={styles.body} style={{ fontSize: 12, marginTop: 8 }}>
            {it.detail}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Masthead ────────────────────────────────────────────────────────────────
function Masthead() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      style={{ position: "fixed", top: 16, left: 0, right: 0, zIndex: 50, padding: "0 32px" }}
    >
      <div className={styles.shell} style={{ padding: 0, position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              href="/"
              className={styles.liquidGlass}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
              aria-label="UGround"
            >
              <span className={styles.fontHeading} style={{ fontSize: 22, lineHeight: 1, color: "#fff" }}>
                U
              </span>
            </Link>
          </div>

          <nav
            className={`${styles.liquidGlass} ${styles.navDesktop}`}
            style={{
              borderRadius: 999,
              padding: "6px 8px",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Link
              href="/login"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                textDecoration: "none",
                fontWeight: 400,
              }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={styles.btnWhite}
              style={{ marginLeft: 6, padding: "6px 14px", fontSize: 12 }}
            >
              Start watching <ArrowUpRight size={12} />
            </Link>
          </nav>

          <button
            type="button"
            className={`${styles.liquidGlass} ${styles.navMobileBtn}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label="Toggle menu"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>

        {menuOpen && (
          <div
            id="mobile-nav-panel"
            className={`${styles.liquidGlassStrong} ${styles.navMobilePanel}`}
          >
            <Link href="/login" className={styles.navMobileLink} onClick={closeMenu}>
              Sign in
            </Link>
            <Link href="/signup" className={styles.navMobileLink} onClick={closeMenu}>
              Start watching
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", paddingTop: 88, paddingBottom: 64 }}>
      <div className={styles.heroBackdrop} aria-hidden="true" />
      <div className={styles.fadeBottomTall} />

      <div className={`${styles.shell} ${styles.z10}`}>
        {/* Brand rule */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            paddingBottom: 14,
            borderBottom: "1px solid rgba(255,255,255,0.18)",
            marginBottom: 32,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            className={styles.fontHeading}
            style={{ fontSize: "clamp(22px, 2.4vw, 32px)", lineHeight: 1 }}
          >
            UGround
          </div>
          <div className={styles.eyebrow}>
            Free while in beta · 6 ticket sources · polled every 60s
          </div>
        </div>

        {/* Hero spread */}
        <div className={styles.heroGrid}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <BlurIn>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <div
                    className={`${styles.liquidGlass} ${styles.pill}`}
                    style={{ paddingLeft: 6, paddingRight: 14, borderRadius: 999 }}
                  >
                    <span
                      style={{
                        background: "#fff",
                        color: "#0a0a0b",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      New
                    </span>
                    <span style={{ fontSize: 12 }}>Watchlist-powered presale alerts.</span>
                  </div>
                </div>
              </BlurIn>
              <BlurText
                text="Catch the show before the feed wakes up."
                delay={90}
                as="h1"
                className={styles.hMega}
                style={{ marginTop: 18, maxWidth: 760 }}
              />
              <BlurIn delay={0.6}>
                <p
                  className={styles.lead}
                  style={{ maxWidth: 540, marginTop: 20, color: "rgba(255,255,255,0.85)" }}
                >
                  Follow the artists, venues, and cities you actually care about. UGround watches
                  public ticket sources and pings you the second something moves.
                </p>
              </BlurIn>
            </div>
            <BlurIn delay={1.0}>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  marginTop: 32,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href="/signup"
                  className={`${styles.liquidGlassStrong} ${styles.pillStrong}`}
                  style={{ borderRadius: 999, padding: "12px 22px", fontSize: 14 }}
                >
                  Start watching <ArrowUpRight size={14} />
                </Link>
                <a href="#how" className={styles.btnText}>
                  <span
                    className={styles.liquidGlass}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <PlayIcon size={10} />
                  </span>
                  See how it works
                </a>
              </div>
            </BlurIn>
          </div>

          {/* Right: live wire portrait card */}
          <BlurIn delay={0.3}>
            <div
              className={styles.liquidGlass}
              style={{
                borderRadius: 24,
                overflow: "hidden",
                height: "100%",
                minHeight: 460,
                position: "relative",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/concert-crowd.jpg"
                alt="A packed concert crowd under red stage lights"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.75) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  bottom: 14,
                  right: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div className={styles.eyebrow} style={{ fontSize: 9 }}>
                    COVER · 04.12
                  </div>
                  <div className={styles.fontHeading} style={{ fontSize: 22, lineHeight: 1 }}>
                    Tonight&rsquo;s wire
                  </div>
                </div>
                <div
                  className={`${styles.liquidGlass} ${styles.pill}`}
                  style={{ borderRadius: 999, padding: "4px 10px", fontSize: 10 }}
                >
                  ● LIVE
                </div>
              </div>
            </div>
          </BlurIn>
        </div>

        {/* Sources marquee */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px dashed rgba(255,255,255,0.18)",
            overflow: "hidden",
          }}
        >
          <div className={styles.eyebrow} style={{ marginBottom: 16 }}>
            WATCHING THE SOURCES YOU ALREADY USE
          </div>
          <div
            style={{
              overflow: "hidden",
              maskImage:
                "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
            }}
          >
            <div className={styles.marquee}>
              {[...SOURCES, ...SOURCES, ...SOURCES].map((p, i) => (
                <span
                  key={i}
                  className={styles.fontHeading}
                  style={{
                    fontSize: "clamp(28px, 3.4vw, 44px)",
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: 1,
                  }}
                >
                  {p}
                  <span style={{ marginLeft: 72, color: "rgba(255,255,255,0.25)" }}>◆</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Process — How It Works ──────────────────────────────────────────────────
function ProcessSection() {
  return (
    <section id="how" style={{ position: "relative", overflow: "hidden", padding: "140px 0" }}>
      <HlsVideo src={PROCESS_HLS} />
      <div className={styles.dimOverlay} style={{ background: "rgba(0,0,0,0.6)" }} />
      <div className={styles.fadeTop} />
      <div className={styles.fadeBottom} />

      <div className={`${styles.shell} ${styles.z10}`}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 32,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div className={`${styles.liquidGlass} ${styles.pill}`} style={{ borderRadius: 999 }}>
            Chapter I · How it works
          </div>
        </div>

        <BlurText
          text="You follow. We watch. You go."
          className={styles.hSection}
          as="h2"
          style={{ maxWidth: 900, marginBottom: 24 }}
          delay={70}
        />
        <BlurIn delay={0.3}>
          <p className={styles.lead} style={{ maxWidth: 620, marginBottom: 36 }}>
            Tell UGround which artists and venues matter. We poll the public sources every minute
            and surface the changes that actually mean a ticket — nothing else.
          </p>
        </BlurIn>

        <div className={styles.processGrid}>
          {[
            ["01", "Follow", "Add artists, venues, and cities to your watchlist in seconds."],
            ["02", "Watch", "We poll Ticketmaster, Eventbrite, AXS, DICE & more — every minute."],
            ["03", "Detect", "Status flips, new dates, earlier presales — surfaced the moment they appear."],
            ["04", "Notify", "Email, Discord, SMS — your fastest channel wins. We don't sit on a flip."],
          ].map(([n, t, d], i, arr) => (
            <div
              key={n}
              style={{
                padding: "32px 24px 32px 0",
                borderRight:
                  i < arr.length - 1 ? "1px dashed rgba(255,255,255,0.18)" : "none",
                paddingLeft: i === 0 ? 0 : 24,
              }}
            >
              <div className={styles.numplate} style={{ marginBottom: 12 }}>
                {n}
              </div>
              <div className={styles.fontHeading} style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>
                {t}
              </div>
              <div className={styles.body} style={{ color: "rgba(255,255,255,0.7)" }}>
                {d}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40 }}>
          <Link
            href="/signup"
            className={`${styles.liquidGlassStrong} ${styles.pillStrong}`}
            style={{ borderRadius: 999, padding: "14px 24px", fontSize: 14 }}
          >
            Start watching <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Coverage / Detection (chess) ────────────────────────────────────────────
function FeaturesChess() {
  return (
    <section id="sources" style={{ background: "#000", padding: "120px 0" }}>
      <div className={styles.shell}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 40,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className={`${styles.liquidGlass} ${styles.pill}`}
              style={{ borderRadius: 999, marginBottom: 18, display: "inline-flex" }}
            >
              Chapter II · Coverage
            </div>
            <BlurText
              text="Watch wide. Notify narrow."
              className={styles.hSection}
              as="h2"
              style={{ maxWidth: 900 }}
              delay={70}
            />
          </div>
        </div>

        {/* Row 1: Watchlist coverage */}
        <div
          className={styles.chess}
          style={{
            gridTemplateColumns: "1fr 1.3fr",
            gap: 56,
            alignItems: "center",
            paddingTop: 56,
            paddingBottom: 56,
            borderTop: "1px dashed rgba(255,255,255,0.18)",
          }}
        >
          <BlurIn>
            <div className={styles.eyebrow} style={{ marginBottom: 14 }}>
              Essay 01 · Watchlist
            </div>
            <h3
              className={styles.fontHeading}
              style={{
                fontSize: "clamp(32px, 3.6vw, 52px)",
                lineHeight: 1,
                marginBottom: 20,
                letterSpacing: "-0.015em",
              }}
            >
              Follow the lane.
              <br />
              <span className={styles.hl}>Skip the firehose.</span>
            </h3>
            <p className={styles.body} style={{ marginBottom: 24, maxWidth: 480 }}>
              Add artists, venues, cities, or radius rules. Import a Spotify playlist if that&rsquo;s
              easier. UGround only watches what you actually care about — no calendar of every show
              in the country, no algorithmic guesses.
            </p>
            <Link
              href="/signup"
              className={`${styles.liquidGlassStrong} ${styles.pillStrong}`}
              style={{ borderRadius: 999, padding: "12px 22px", fontSize: 13 }}
            >
              Build your watchlist <ArrowUpRight size={13} />
            </Link>
          </BlurIn>
          <BlurIn delay={0.2}>
            <div
              className={styles.liquidGlass}
              style={{
                borderRadius: 24,
                overflow: "hidden",
                aspectRatio: "16 / 11",
                background: "#0a0a0b",
              }}
            >
              <WatchlistMock />
            </div>
          </BlurIn>
        </div>

        {/* Row 2: Detection */}
        <div
          className={styles.chess}
          style={{
            gridTemplateColumns: "1.3fr 1fr",
            gap: 56,
            alignItems: "center",
            paddingTop: 56,
            paddingBottom: 56,
            borderTop: "1px dashed rgba(255,255,255,0.18)",
          }}
        >
          <BlurIn>
            <div
              className={styles.liquidGlass}
              style={{
                borderRadius: 24,
                overflow: "hidden",
                aspectRatio: "16 / 11",
                background: "#0a0a0b",
              }}
            >
              <AlertFeedMock />
            </div>
          </BlurIn>
          <BlurIn delay={0.2}>
            <div className={styles.eyebrow} style={{ marginBottom: 14 }}>
              Essay 02 · Detection
            </div>
            <h3
              className={styles.fontHeading}
              style={{
                fontSize: "clamp(32px, 3.6vw, 52px)",
                lineHeight: 1,
                marginBottom: 20,
                letterSpacing: "-0.015em",
              }}
            >
              We don&rsquo;t list shows.
              <br />
              <span className={styles.hl}>We list changes.</span>
            </h3>
            <p className={styles.body} style={{ marginBottom: 24, maxWidth: 480 }}>
              Status flips from announced to on-sale. Presales cracking open early. New dates
              landing in your radius. UGround surfaces the moment something becomes a ticket — and
              gets out of the way otherwise.
            </p>
            <a
              href="#numbers"
              className={`${styles.liquidGlassStrong} ${styles.pillStrong}`}
              style={{ borderRadius: 999, padding: "12px 22px", fontSize: 13 }}
            >
              See the numbers <ArrowUpRight size={13} />
            </a>
          </BlurIn>
        </div>
      </div>
    </section>
  );
}

// ── Pull quote ──────────────────────────────────────────────────────────────
function PullQuote() {
  return (
    <section style={{ padding: "120px 0", background: "#000" }}>
      <div className={styles.shell}>
        <div
          style={{
            borderTop: "2px solid rgba(255,255,255,0.85)",
            borderBottom: "2px solid rgba(255,255,255,0.85)",
            padding: "64px 24px",
            textAlign: "center",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <BlurText
            text='"My phone buzzed forty seconds after Ticketmaster flipped. I had two seats before the announcement hit Twitter."'
            className={styles.fontHeading}
            style={{ fontSize: "clamp(32px, 4.5vw, 64px)", lineHeight: 1.05, letterSpacing: "-0.01em" }}
            delay={40}
          />
          <div className={styles.eyebrow} style={{ marginTop: 28 }}>
            — DANIEL ORTEGA · BROOKLYN, NY
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Why Us ──────────────────────────────────────────────────────────────────
type IconComp = ({ size }: { size?: number }) => React.ReactElement;

function WhyUs() {
  const items: [string, IconComp, string, string][] = [
    ["A", ZapIcon, "Seconds, Not Hours", "We poll once a minute and push the second something flips. No nightly digest, no batched email."],
    ["B", ListIcon, "Watchlist-First", "You decide who's worth a ping. We don't pretend every show in your city is interesting."],
    ["C", RadarIcon, "Real Sources", "Ticketmaster, Eventbrite, Songkick, Bandsintown, AXS, DICE — the platforms that actually sell the seats."],
    ["D", BellIcon, "Your Channels", "Email, Discord, SMS. Pick one, pick three. Whichever buzzes loudest when it matters."],
  ];

  return (
    <section style={{ background: "#000", padding: "120px 0" }}>
      <div className={styles.shell}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 40,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className={`${styles.liquidGlass} ${styles.pill}`}
              style={{ borderRadius: 999, marginBottom: 18, display: "inline-flex" }}
            >
              Why UGround
            </div>
            <BlurText
              text="The difference is the difference."
              className={styles.hSection}
              as="h2"
              style={{ maxWidth: 900 }}
              delay={70}
            />
          </div>
          <div className={styles.eyebrow} style={{ opacity: 0.6 }}>
            PP. 07
          </div>
        </div>

        <div className={styles.grid4} style={{ marginTop: 24 }}>
          {items.map(([k, Icon, t, d]) => (
            <BlurIn key={k} delay={0.05 * "ABCD".indexOf(k)}>
              <div
                className={`${styles.liquidGlass} ${styles.cardLift}`}
                style={{
                  borderRadius: 20,
                  padding: 26,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 28,
                  }}
                >
                  <div
                    className={styles.liquidGlassStrong}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    className={styles.fontHeading}
                    style={{ fontSize: 28, lineHeight: 1, color: "rgba(255,255,255,0.4)" }}
                  >
                    {k}
                  </div>
                </div>
                <h4
                  className={styles.fontHeading}
                  style={{ fontSize: 28, lineHeight: 1, marginBottom: 12, letterSpacing: "-0.01em" }}
                >
                  {t}
                </h4>
                <p
                  className={styles.body}
                  style={{ color: "rgba(255,255,255,0.65)", marginTop: "auto" }}
                >
                  {d}
                </p>
              </div>
            </BlurIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats ────────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section
      id="numbers"
      style={{ position: "relative", overflow: "hidden", padding: "160px 0" }}
    >
      <HlsVideo src={STATS_HLS} saturate={0} />
      <div className={styles.dimOverlay} style={{ background: "rgba(0,0,0,0.6)" }} />
      <div className={styles.fadeTop} />
      <div className={styles.fadeBottom} />

      <div className={`${styles.shell} ${styles.z10}`}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 40,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className={`${styles.liquidGlass} ${styles.pill}`}
              style={{ borderRadius: 999, marginBottom: 18, display: "inline-flex" }}
            >
              Chapter III · By the numbers
            </div>
            <BlurText
              text="The receipts."
              className={styles.hSection}
              as="h2"
              style={{ maxWidth: 900 }}
              delay={70}
            />
          </div>
        </div>

        <BlurIn>
          <div className={styles.liquidGlass} style={{ borderRadius: 28, padding: "8px 36px" }}>
            {[
              ["6", "Sources watched", "ticketmaster · eventbrite · songkick · …"],
              ["60s", "Poll cadence", "every artist, every minute"],
              ["3", "Notification channels", "email · discord · sms"],
              ["< 90s", "Median alert latency", "flip to phone"],
            ].map(([v, l, ctx]) => (
              <div key={l} className={styles.ledgerRow}>
                <div
                  className={styles.fontHeading}
                  style={{
                    fontSize: "clamp(56px, 7vw, 96px)",
                    lineHeight: 0.85,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {v}
                </div>
                <div>
                  <div
                    style={{ fontSize: 18, color: "#fff", fontWeight: 500, fontFamily: "Barlow, sans-serif" }}
                  >
                    {l}
                  </div>
                  <div className={styles.body} style={{ marginTop: 4 }}>
                    —
                  </div>
                </div>
                <div className={`${styles.ledgerCtx} ${styles.eyebrow}`}>{ctx}</div>
              </div>
            ))}
          </div>
        </BlurIn>
      </div>
    </section>
  );
}

// ── Field reports / Testimonials ─────────────────────────────────────────────
function Testimonials() {
  const quotes: [string, string, string][] = [
    [
      "I'd been refreshing the venue page for a week. UGround pinged me at 11:43 on a Tuesday and I had wristbands by 11:45.",
      "Maya Chen",
      "Photographer · Brooklyn",
    ],
    [
      "The watchlist import from Spotify did half the work for me. It just knows the bands I'd actually drive for.",
      "Jordan Park",
      "Tour manager · Atlanta",
    ],
    [
      "Three small-room shows last quarter that I would have missed entirely. That's three more good nights than I had before.",
      "Eli Thornton",
      "Show-goer · Chicago",
    ],
  ];

  return (
    <section style={{ background: "#000", padding: "120px 0" }}>
      <div className={styles.shell}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 40,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className={`${styles.liquidGlass} ${styles.pill}`}
              style={{ borderRadius: 999, marginBottom: 18, display: "inline-flex" }}
            >
              Chapter IV · Field reports
            </div>
            <BlurText
              text="From the front row."
              className={styles.hSection}
              as="h2"
              style={{ maxWidth: 900 }}
              delay={70}
            />
          </div>
        </div>

        <div className={styles.grid3} style={{ marginTop: 24 }}>
          {quotes.map(([q, n, r], i) => (
            <BlurIn key={n} delay={0.1 * i}>
              <div
                className={`${styles.liquidGlass} ${styles.cardLift}`}
                style={{
                  borderRadius: 20,
                  padding: 32,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className={styles.fontHeading}
                  style={{
                    fontSize: 64,
                    lineHeight: 0.6,
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 12,
                  }}
                >
                  &ldquo;
                </div>
                <p
                  style={{
                    fontSize: 18,
                    lineHeight: 1.4,
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 300,
                    fontStyle: "italic",
                    margin: 0,
                    fontFamily: "Barlow, sans-serif",
                    marginBottom: "auto",
                  }}
                >
                  {q}
                </p>
                <hr className={styles.ruleDashed} style={{ margin: "28px 0 16px" }} />
                <div
                  style={{ fontSize: 14, color: "#fff", fontWeight: 500, fontFamily: "Barlow, sans-serif" }}
                >
                  {n}
                </div>
                <div className={styles.tiny} style={{ marginTop: 2 }}>
                  {r}
                </div>
              </div>
            </BlurIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA + Footer ─────────────────────────────────────────────────────────────
function CtaFooter() {
  const footerCols = [
    { heading: "UGround", links: ["How it works", "Sources", "Numbers", "Field reports"] },
    { heading: "Account", links: ["Sign in", "Create account", "Dashboard", "Reset password"] },
    { heading: "Sources", links: ["Ticketmaster", "Eventbrite", "Songkick", "AXS · DICE"] },
  ];

  return (
    <section id="cta" style={{ position: "relative", overflow: "hidden", padding: "180px 0 0" }}>
      <HlsVideo src={CTA_HLS} />
      <div className={styles.dimOverlay} style={{ background: "rgba(0,0,0,0.45)" }} />
      <div className={styles.fadeTop} />

      <div className={`${styles.shell} ${styles.z10}`}>
        <div className={styles.eyebrow} style={{ marginBottom: 14 }}>
          Chapter V · Begin
        </div>
        <BlurText
          text="Catch your next show first."
          className={styles.fontHeading}
          style={{
            fontSize: "clamp(56px, 8vw, 128px)",
            lineHeight: 0.85,
            letterSpacing: "-0.02em",
            maxWidth: 1100,
            marginBottom: 28,
          }}
          delay={70}
        />
        <BlurIn delay={0.4}>
          <p
            className={styles.lead}
            style={{ maxWidth: 560, marginBottom: 36, color: "rgba(255,255,255,0.85)" }}
          >
            Build a watchlist in two minutes. Pick a channel that buzzes loud enough. We&rsquo;ll
            handle the refreshing.
          </p>
        </BlurIn>
        <BlurIn delay={0.6}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href="/signup"
              className={`${styles.liquidGlassStrong} ${styles.pillStrong}`}
              style={{ borderRadius: 999, padding: "14px 26px", fontSize: 14 }}
            >
              Start watching <ArrowUpRight size={14} />
            </Link>
            <Link href="/login" className={styles.btnWhite} style={{ padding: "14px 26px", fontSize: 14 }}>
              I already have an account
            </Link>
          </div>
        </BlurIn>

        <footer
          style={{
            marginTop: 160,
            paddingTop: 32,
            paddingBottom: 32,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className={styles.footerGrid}>
            <div>
              <div
                className={styles.fontHeading}
                style={{ fontSize: 32, lineHeight: 1, marginBottom: 12 }}
              >
                UGround
              </div>
              <p className={styles.body} style={{ maxWidth: 320 }}>
                Watchlist-powered presale alerts for the artists, venues, and cities you actually
                care about.
              </p>
            </div>
            {footerCols.map(({ heading, links }) => (
              <div key={heading}>
                <div className={styles.eyebrow} style={{ marginBottom: 14 }}>
                  {heading}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {links.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 24,
              borderTop: "1px dashed rgba(255,255,255,0.18)",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div className={styles.tiny} style={{ color: "rgba(255,255,255,0.4)" }}>
              © 2026 UGround. Public sources only — no scraping behind paywalls.
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacy", "Terms", "Contact"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className={styles.tiny}
                  style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div id="studio-landing" className={styles.studioPage}>
      <Masthead />
      <main>
        <Hero />
        <div style={{ background: "#000" }}>
          <ProcessSection />
          <FeaturesChess />
          <PullQuote />
          <WhyUs />
          <Stats />
          <Testimonials />
          <CtaFooter />
        </div>
      </main>
    </div>
  );
}
