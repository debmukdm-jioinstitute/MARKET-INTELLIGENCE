"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, ArrowRight, ExternalLink, Sparkles, CheckCircle2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { TelegramOneClickModal } from "@/components/telegram/telegram-one-click-modal";

// ----------------------------------------------------------------------
// DATA & STREAM DEFINITION
// Matches exact aesthetic, layout, and animation engine of Trading Desk
// ----------------------------------------------------------------------

interface IntegrationAgent {
  title: string;
  icon?: string;
  isBotIcon?: boolean;
  label: string;
  labelColor: string;
  glowColor: string;
  confidence: string;
  subtitle?: string;
  points: string[];
  paragraph?: string;
}

const INTEGRATION_AGENTS: Record<string, IntegrationAgent> = {
  claude: {
    title: "Claude AI · MCP Terminal",
    icon: "/integrations/claude-logo.png",
    label: "CONNECTED · MCP PROTOCOL",
    labelColor: "text-amber-700 bg-amber-50 border-amber-200",
    glowColor: "from-amber-500/5",
    confidence: "Latency: 280ms · Zero Hallucination",
    subtitle: "Claude Desktop & claude.ai",
    points: [
      "User: \"Claude, evaluate RELIANCE against the crude spike and options skew.\"",
      "MCP Tool Call: get_multi_pillar_sentiment(symbol=\"RELIANCE\", include_options=true)",
      "Live verified feed: Brent Crude $101.32 (+4.2%), USD/INR ₹87.42. Pillar Score: -0.59 (Negative).",
      "Options Flow: Heavy 1,180 Call writing detected (+42% OI). PCR inflected to 0.74 (overhead ceiling).",
      "Claude Verdict: Refining margin compression expected on high feedstocks. Defensive hedging advised.",
    ],
  },
  telegram: {
    title: "Telegram Bot · Radar Alert",
    icon: "/integrations/telegram-logo.png",
    label: "SUB-SECOND ALERT",
    labelColor: "text-sky-600 bg-sky-50 border-sky-100",
    glowColor: "from-sky-500/5",
    confidence: "Dispatch: 14:12:08 IST · 240ms",
    subtitle: "@market_intel_alerts_india_bot",
    points: [
      "📡 Radar Trigger: Upstream crude spike + NIFTY 50 sectoral divergence detected across NSE feeds.",
      "Broadcast: Dispatched to @market_intel_alerts_india_bot subscribers (14,200 traders in 240ms).",
      "⚡ BREAKING: NIFTY 24,810 (-0.88%). Brent breaks $101.32. India VIX spikes +7.19% to 14.80.",
      "Bulk deal alert: Foreign institutions net sold ₹1,420 Cr; domestic funds absorbed ₹1,210 Cr.",
      "Interactive Actions: [📊 Open Live Chart] · [🤖 Query Claude Desk] · [📋 View 5-Pillar Score]",
    ],
  },
  engine: {
    title: "5-Pillar Engine · Provenance",
    isBotIcon: true,
    label: "LIVE SYNERGY",
    labelColor: "text-blue-600 bg-blue-50 border-blue-100",
    glowColor: "from-blue-500/5",
    confidence: "Provenance: 100% Sourced",
    subtitle: "NSE · BSE · RBI · FRED",
    points: [
      "Domestic Equities: NSE India breadth at 0.62 (18 adv / 32 dec), Midcap index -1.14%.",
      "Global Disparity: Asian bourses decoupled (Nikkei +3.30% vs Indian bourses -0.88% tracking FTSE -1.64%).",
      "Commodities & FX: WTI Crude +3.8%, USD/INR ₹87.42 (+0.31%), Gold ₹76,400 (+0.45%).",
      "Derivatives: Total Nifty Put-Call Ratio at 0.81; Max Pain pinned at 24,900 strike.",
      "Synthesis Result: Market-wide sentiment flags negative (-0.59) with high crude sensitivity.",
    ],
  },
  pipeline: {
    title: "1-Click Telegram & Claude Setup",
    label: "READY IN 10 SECONDS",
    labelColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
    glowColor: "from-emerald-500/5",
    confidence: "Zero API Key Required",
    subtitle: "Free during beta",
    points: [
      "Step 1: Tap \"Connect Telegram Bot in 1 Click\" below — opens @market_intel_alerts_india_bot in Telegram.",
      "Step 2: Tap /start: Instant activation for breaking disclosures, macro shocks, and 08:30 AM briefs.",
      "Step 3: On a paid plan, connect Claude AI via MCP URL in Claude Desktop or claude.ai for natural language research.",
      "Live Guarantee: Every number shows origin exchange, timestamp, and mathematical formula.",
      "No credit card required. Full institutional capabilities unlocked instantly.",
    ],
  },
};

const ROWS: { keys: (keyof typeof INTEGRATION_AGENTS)[]; grid: string }[] = [
  { keys: ["claude", "telegram"], grid: "md:grid-cols-2" },
  { keys: ["engine", "pipeline"], grid: "md:grid-cols-2" },
];

const linesOf = (a: IntegrationAgent) => [...(a.paragraph ? [a.paragraph] : []), ...a.points];

const CHARS_PER_MS = 0.12;
const ROW_GAP_MS = 400;
const HOLD_MS = 6000;

function IntegrationCard({
  agent,
  id,
  onOpenTelegram,
}: {
  agent: IntegrationAgent;
  id: string;
  onOpenTelegram: () => void;
}) {
  const lines = linesOf(agent);

  return (
    <div
      data-card={id}
      data-state="idle"
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 p-5 shadow-[var(--shadow-sm)] transition-opacity duration-300 data-[state=idle]:opacity-40 sm:p-6 gpu-composited safari-flex-fix"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {agent.icon ? (
            <div className="relative size-6 shrink-0 overflow-hidden rounded shadow-xs">
              <Image
                src={agent.icon}
                alt={agent.title}
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          ) : agent.isBotIcon ? (
            <div className="grid size-6 shrink-0 place-items-center rounded bg-blue-100 text-blue-600">
              <Bot className="size-3.5" />
            </div>
          ) : null}

          <h4 className="font-semibold tracking-tight text-gray-900">{agent.title}</h4>
          <span className="relative hidden h-2 w-2 group-data-[state=typing]:flex">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
        </div>

        {agent.label ? (
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shrink-0",
              agent.labelColor
            )}
          >
            {agent.label}
          </span>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 text-[13px] leading-relaxed">
        {lines.map((text, i) => {
          const isPara = Boolean(agent.paragraph) && i === 0;
          const Wrapper = isPara ? "p" : "div";
          return (
            <Wrapper key={i} className={cn(isPara ? "text-gray-700" : "flex gap-2 text-gray-600")}>
              {!isPara ? (
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
              ) : null}
              <span>
                <span data-typed={`${id}:${i}`} />
                <span data-rest={`${id}:${i}`} className="text-transparent select-none">
                  {text}
                </span>
              </span>
            </Wrapper>
          );
        })}
      </div>

      {id === "telegram" ? (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenTelegram}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="size-3" />
            <span>1-Click Setup Bot</span>
          </button>
          <span className="text-[11px] text-muted-foreground font-medium">@market_intel_alerts_india_bot</span>
        </div>
      ) : null}

      {id === "claude" ? (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <Link
            href="/connect/claude"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-300/40 px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <Sparkles className="size-3 text-amber-700" />
            <span>Setup Claude MCP</span>
            <ArrowRight className="size-3 text-amber-700" />
          </Link>
          <span className="text-[11px] text-muted-foreground font-medium">Model Context Protocol</span>
        </div>
      ) : null}

      {agent.confidence ? (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200/60 pt-3 opacity-0 transition-opacity duration-500 group-data-[state=done]:opacity-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Status: <span className="text-gray-600">{agent.confidence}</span>
          </p>
          {agent.subtitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {agent.subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function IntegrationsBentoShowcase() {
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const track = trackRef.current;
    if (!box || !track) return;

    const q = <T extends Element>(sel: string) => track.querySelector<T>(sel);
    const cards = Object.keys(INTEGRATION_AGENTS) as (keyof typeof INTEGRATION_AGENTS)[];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const written = new Map<string, number>();
    const setLine = (id: string, i: number, text: string, n: number) => {
      const key = `${id}:${i}`;
      if (written.get(key) === n) return;
      written.set(key, n);
      const typed = q<HTMLElement>(`[data-typed="${key}"]`);
      const rest = q<HTMLElement>(`[data-rest="${key}"]`);
      if (typed) typed.textContent = text.slice(0, n);
      if (rest) rest.textContent = text.slice(n);
    };
    const setState = (id: string, state: "idle" | "typing" | "done") => {
      const el = q<HTMLElement>(`[data-card="${id}"]`);
      if (el && el.dataset.state !== state) el.dataset.state = state;
    };
    const render = (id: keyof typeof INTEGRATION_AGENTS, chars: number) => {
      let left = chars;
      linesOf(INTEGRATION_AGENTS[id]).forEach((text, i) => {
        const n = Math.max(0, Math.min(text.length, left));
        setLine(id, i, text, n);
        left -= text.length;
      });
    };
    const total = (id: keyof typeof INTEGRATION_AGENTS) =>
      linesOf(INTEGRATION_AGENTS[id]).reduce((a, t) => a + t.length, 0);

    const resetAll = () => {
      written.clear();
      cards.forEach((id) => {
        render(id, 0);
        setState(id, "idle");
      });
      track.style.transition = "none";
      track.style.transform = "translate3d(0,0,0)";
    };
    const showAll = () => {
      cards.forEach((id) => {
        render(id, total(id));
        setState(id, "done");
      });
    };

    if (reduced) {
      showAll();
      return;
    }

    const stacked = window.matchMedia("(max-width: 767px)").matches;
    const steps = stacked
      ? ROWS.flatMap((r) => r.keys.map((k) => [k]))
      : ROWS.map((r) => r.keys);

    const rowStart: number[] = [];
    let t = 400;
    for (const keys of steps) {
      rowStart.push(t);
      t += Math.max(...keys.map((k) => total(k) / CHARS_PER_MS)) + ROW_GAP_MS;
    }
    const typingEnd = t;
    const cycle = typingEnd + HOLD_MS;

    let followedRow = -1;
    const follow = (rowIdx: number) => {
      if (rowIdx === followedRow) return;
      followedRow = rowIdx;
      const target = q<HTMLElement>(`[data-card="${steps[rowIdx]![0]}"]`);
      const max = Math.max(0, track.scrollHeight - box.clientHeight);
      const top = target
        ? target.getBoundingClientRect().top - track.getBoundingClientRect().top
        : 0;
      const y = Math.min(max, Math.max(0, top - 8));
      track.style.transition =
        rowIdx === 0 ? "none" : "transform 800ms cubic-bezier(0.22, 1, 0.36, 1)";
      track.style.transform = `translate3d(0,${-y}px,0)`;
    };

    let raf = 0;
    let running = false;
    let elapsed = 0;
    let last = 0;

    const frame = (now: number) => {
      elapsed += Math.min(now - last, 100);
      last = now;

      if (elapsed >= cycle) {
        elapsed = 0;
        followedRow = -1;
        resetAll();
      }

      steps.forEach((keys, r) => {
        const local = elapsed - rowStart[r]!;
        keys.forEach((id) => {
          if (local < 0) return;
          const done = total(id);
          const chars = Math.min(done, Math.floor(local * CHARS_PER_MS));
          render(id, chars);
          setState(id, chars >= done ? "done" : "typing");
        });
        if (local >= 0) follow(r);
      });
      if (elapsed >= typingEnd - ROW_GAP_MS) follow(steps.length - 1);

      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resetAll();
    let visible = false;
    const sync = () => (visible && !document.hidden ? start() : stop());
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        sync();
      },
      { threshold: 0.25 }
    );
    io.observe(box);
    document.addEventListener("visibilitychange", sync);

    const ro = new ResizeObserver(() => {
      followedRow = -1;
    });
    ro.observe(box);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <section
      id="integrations"
      className="cv-section relative border-b border-white/60 bg-white/30 px-5 py-24 backdrop-blur-xl md:py-32 overflow-hidden scroll-mt-20"
    >
      {/* Ambient background glows for 3D depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-gradient-to-r from-sky-400/10 via-blue-500/10 to-amber-400/10 rounded-[100%] blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-tight text-gray-900 leading-[1.1]">
            Claude AI &amp; Telegram Bot in Action
          </h2>
          <p className="mt-5 text-lg text-gray-600 leading-relaxed">
            Paid plan: connect Claude Desktop via MCP to query live market tools, and receive catalyst alerts on Telegram (Free).
          </p>
        </div>

        {/* The 3D Glassmorphism Container */}
        <div className="ai-desk-container relative mx-auto max-w-5xl rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-[0_30px_80px_-20px_rgba(37,99,235,0.15)] sm:p-10 backdrop-blur-xl">
          <div className="mb-8 flex items-center justify-between border-b border-gray-200/50 pb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                Live integration feed — recorded stream
              </h3>
              <p className="text-sm font-medium text-gray-500 mt-1">
                Claude Desktop MCP (port 3000) · @market_intel_alerts_india_bot · Live Execution
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTelegramModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors shadow-xs"
              >
                <Send className="size-3" />
                <span>1-Click Bot Setup</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 border border-white/70 shadow-sm">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  Live Stream
                </span>
              </div>
            </div>
          </div>

          {/* Animated Integrations Stream */}
          <div
            ref={boxRef}
            className="relative h-[560px] overflow-hidden rounded-3xl sm:h-[600px]"
            style={{ contain: "layout paint style" }}
            aria-label="Live integrations stream"
          >
            <div ref={trackRef} className="space-y-5 will-change-transform">
              {ROWS.map((row, r) => (
                <div key={r} data-row={r} className={cn("grid gap-5", row.grid)}>
                  {row.keys.map((k) => (
                    <IntegrationCard
                      key={k}
                      id={k}
                      agent={INTEGRATION_AGENTS[k]}
                      onOpenTelegram={() => setTelegramModalOpen(true)}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* Soft fade so cards slide under bottom edge */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/70 to-transparent" />
          </div>

          {/* Provenance and Output Note */}
          <div className="mt-6 rounded-2xl border border-gray-200/80 bg-white/70 p-4 text-xs text-gray-600 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>
                Claude queries execute via open <b>Model Context Protocol (MCP)</b>. Telegram alerts are dispatched with sub-second latency from the 5-pillar engine.
              </span>
            </div>
            <span className="font-semibold text-gray-500 shrink-0">
              Zero fabrication · Pure exchange provenance
            </span>
          </div>
        </div>

        {/* Call to action buttons */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-4 text-center">
          <button
            type="button"
            onClick={() => setTelegramModalOpen(true)}
            className="inline-flex items-center gap-2.5 rounded-full bg-sky-500 px-8 py-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(14,165,233,0.5)] transition hover:scale-[1.03] hover:bg-sky-600 active:scale-[0.98]"
          >
            <Send className="size-4" />
            <span>Connect Telegram Bot in 1 Click →</span>
          </button>

          <Link
            href="/connect/claude"
            className="inline-flex items-center gap-2.5 rounded-full border border-gray-300/80 bg-white/80 px-8 py-4 text-[15px] font-semibold text-gray-800 shadow-sm backdrop-blur-md transition hover:scale-[1.03] hover:bg-white"
          >
            <div className="relative size-4 shrink-0 overflow-hidden rounded">
              <Image
                src="/integrations/claude-logo.png"
                alt="Claude AI"
                width={16}
                height={16}
                className="object-contain"
              />
            </div>
            <span>Setup Claude MCP Guide →</span>
          </Link>

          <Link
            href="/help#telegram"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-4 text-[15px] font-medium text-blue-600 hover:underline"
          >
            <span>Bot Commands &amp; Help</span>
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>

      {/* 1-Click Telegram Modal Dialog */}
      <TelegramOneClickModal open={telegramModalOpen} onOpenChange={setTelegramModalOpen} />
    </section>
  );
}
