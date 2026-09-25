"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------
// DATA
// ----------------------------------------------------------------------

const AGENTS = {
  fundamental: {
    title: "Fundamental Analyst",
    label: "BEARISH",
    labelColor: "text-red-600 bg-red-50 border-red-100",
    glowColor: "from-red-500/5",
    confidence: "68%",
    points: [
      "P/E (31.43x) exceeds sector avg (27.17x)",
      "P/B (4.3x) above sector (3.48x)",
      "ROA, ROE, ROCE all lag sector benchmarks",
      "Quick ratio (1.35x) below sector (2.01x)",
      "EV/EBITDA (17.82x) higher than sector (14.98x)",
    ],
  },
  sentiment: {
    title: "Sentiment Analyst",
    label: "BULLISH",
    labelColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
    glowColor: "from-emerald-500/5",
    confidence: "85%",
    points: [
      "Adani Ports jumped 5% on Sep 18",
      "Adani Group stocks rallied per Jefferies",
      "Growth drivers flagged for Adani Ports",
    ],
  },
  technical: {
    title: "Technical Analyst",
    label: "NEUTRAL",
    labelColor: "text-gray-500 bg-gray-100 border-gray-200",
    glowColor: "from-gray-500/5",
    confidence: "60%",
    points: [
      "SMA20 (1721.83) is slightly below SMA50 (1728.51) indicating short-term weakness",
      "RSI14 at 57 suggests moderate momentum without overbought pressure",
      "Price is near the high end of its 52-week range (0.85) and recent returns are modest",
    ],
  },
  bull: {
    title: "Bull Researcher",
    label: "",
    labelColor: "",
    glowColor: "from-emerald-500/5",
    confidence: "",
    paragraph:
      "Despite valuation metrics that sit above sector averages, the recent price momentum and strong group-wide rally provide a compelling short-term upside narrative for Adani Ports, while its position near the top of the 52-week range suggests limited downside risk. The bullish sentiment and growth drivers highlighted by analysts create a favorable backdrop for investors seeking exposure to the logistics sector.",
    points: [
      "P/E and EV/EBITDA exceed sector norms, but the stock has already rallied 5% on recent news, indicating positive market sentiment",
      "RSI at 57 and price near the high end of its 52-week range point to moderate momentum without overbought pressure",
      "Group-wide rally and growth catalysts cited by sentiment analysts support a bullish outlook despite weaker fundamentals",
    ],
  },
  bear: {
    title: "Bear Researcher",
    label: "",
    labelColor: "",
    glowColor: "from-red-500/5",
    confidence: "",
    paragraph:
      "The stock appears overvalued relative to its peers and exhibits weaker fundamentals, suggesting limited upside potential. Combined with modest technical signals and a price already near its 52-week high, the risk-reward profile leans against a purchase at current levels.",
    points: [
      "P/E (31.43x) and EV/EBITDA (17.82x) exceed sector averages, indicating overvaluation",
      "ROA, ROE and ROCE lag sector benchmarks, reflecting weaker profitability",
      "Quick ratio (1.35x) is well below the sector norm of 2.01x, raising liquidity concerns",
      "SMA20 below SMA50 points to short-term weakness despite recent price gains",
      "Price is already near the top of its 52-week range, limiting further upside",
    ],
  },
  trader: {
    title: "Trader",
    label: "BUY",
    labelColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
    glowColor: "from-emerald-500/5",
    confidence: "62%",
    subtitle: "illustrative size 3.0%",
    paragraph:
      "While fundamentals are lagging peers, strong short-term momentum and group-wide rally suggest upside potential near the 52-week high, making a modest exposure attractive.",
    points: [],
  },
};

// ----------------------------------------------------------------------
// ENGINE
//
// The whole debate plays inside one fixed-height box, so nothing here can push
// the page around while it runs:
//  - every card always holds its FULL text (typed part visible, the rest
//    transparent), so the layout never changes while typing
//  - typing is written straight to the DOM in one requestAnimationFrame loop
//    (no React state, no re-render per character)
//  - the box "follows" the debate with a GPU transform, not by scrolling the page
//  - the loop only runs while the box is on screen and the tab is visible
// ----------------------------------------------------------------------

type Agent = {
  title: string;
  label: string;
  labelColor: string;
  glowColor: string;
  confidence: string;
  points: string[];
  paragraph?: string;
  subtitle?: string;
};

const linesOf = (a: Agent) => [...(a.paragraph ? [a.paragraph] : []), ...a.points];

/** Rows play one after another; cards inside a row type together. */
const ROWS: { keys: (keyof typeof AGENTS)[]; grid: string }[] = [
  { keys: ["fundamental", "sentiment", "technical"], grid: "md:grid-cols-3" },
  { keys: ["bull", "bear"], grid: "md:grid-cols-2" },
  { keys: ["trader"], grid: "grid-cols-1" },
];

const CHARS_PER_MS = 0.11; // ~110 chars/second per card
const ROW_GAP_MS = 350;
const HOLD_MS = 5000; // pause on the finished debate before replaying

function AgentCard({ agent, id }: { agent: Agent; id: string }) {
  const lines = linesOf(agent);
  return (
    <div
      data-card={id}
      data-state="idle"
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 p-5 shadow-[var(--shadow-sm)] transition-opacity duration-300 data-[state=idle]:opacity-40 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold tracking-tight text-gray-900">{agent.title}</h4>
          <span className="relative hidden h-2 w-2 group-data-[state=typing]:flex">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
        </div>
        {agent.label ? (
          <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest", agent.labelColor)}>{agent.label}</span>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 text-[13px] leading-relaxed">
        {lines.map((text, i) => {
          const isPara = Boolean(agent.paragraph) && i === 0;
          const Wrapper = isPara ? "p" : "div";
          return (
            <Wrapper key={i} className={cn(isPara ? "text-gray-700" : "flex gap-2 text-gray-600")}>
              {!isPara ? <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-300" /> : null}
              <span>
                <span data-typed={`${id}:${i}`} />
                <span data-rest={`${id}:${i}`} className="text-transparent select-none">{text}</span>
              </span>
            </Wrapper>
          );
        })}
      </div>

      {agent.confidence ? (
        <div className="mt-5 flex items-center justify-between border-t border-gray-200/60 pt-4 opacity-0 transition-opacity duration-500 group-data-[state=done]:opacity-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Confidence: <span className="text-gray-600">{agent.confidence}</span>
          </p>
          {agent.subtitle ? <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{agent.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function LiveDebate() {
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const track = trackRef.current;
    if (!box || !track) return;

    const q = <T extends Element>(sel: string) => track.querySelector<T>(sel);
    const cards = Object.keys(AGENTS) as (keyof typeof AGENTS)[];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Per-card typing state, written straight to the DOM.
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
    const render = (id: keyof typeof AGENTS, chars: number) => {
      let left = chars;
      linesOf(AGENTS[id]).forEach((text, i) => {
        const n = Math.max(0, Math.min(text.length, left));
        setLine(id, i, text, n);
        left -= text.length;
      });
    };
    const total = (id: keyof typeof AGENTS) => linesOf(AGENTS[id]).reduce((a, t) => a + t.length, 0);
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

    // Steps play one after another; cards inside a step type together. On phones the cards
    // are stacked, so each card is its own step and the box follows it down.
    const stacked = window.matchMedia("(max-width: 767px)").matches;
    const steps = stacked ? ROWS.flatMap((r) => r.keys.map((k) => [k])) : ROWS.map((r) => r.keys);

    // Timeline: when each step starts, and how long its slowest card takes.
    const rowStart: number[] = [];
    let t = 400;
    for (const keys of steps) {
      rowStart.push(t);
      t += Math.max(...keys.map((k) => total(k) / CHARS_PER_MS)) + ROW_GAP_MS;
    }
    const typingEnd = t;
    const cycle = typingEnd + HOLD_MS;

    // Follow the active row with a transform, never by scrolling the page.
    let followedRow = -1;
    const follow = (rowIdx: number) => {
      if (rowIdx === followedRow) return;
      followedRow = rowIdx;
      const target = q<HTMLElement>(`[data-card="${steps[rowIdx]![0]}"]`);
      const max = Math.max(0, track.scrollHeight - box.clientHeight);
      // rect difference is unaffected by the track's current transform
      const top = target ? target.getBoundingClientRect().top - track.getBoundingClientRect().top : 0;
      const y = Math.min(max, Math.max(0, top - 8));
      track.style.transition = rowIdx === 0 ? "none" : "transform 800ms cubic-bezier(0.22, 1, 0.36, 1)";
      track.style.transform = `translate3d(0,${-y}px,0)`;
    };

    let raf = 0;
    let running = false;
    let elapsed = 0;
    let last = 0;

    const frame = (now: number) => {
      elapsed += Math.min(now - last, 100); // clamp so a background-tab gap doesn't skip ahead
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
      { threshold: 0.25 },
    );
    io.observe(box);
    document.addEventListener("visibilitychange", sync);

    // Re-measure the follow offset if the box is resized (rotation, breakpoint change).
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
    <div
      ref={boxRef}
      className="relative h-[560px] overflow-hidden rounded-3xl sm:h-[600px]"
      style={{ contain: "layout paint style" }}
      aria-label="Live multi-agent debate"
    >
      <div ref={trackRef} className="space-y-5 will-change-transform">
        {ROWS.map((row, r) => (
          <div key={r} data-row={r} className={cn("grid gap-5", row.grid)}>
            {row.keys.map((k) => (
              <AgentCard key={k} id={k} agent={AGENTS[k]} />
            ))}
          </div>
        ))}
      </div>
      {/* soft fade so cards slide under the bottom edge instead of being cut */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/70 to-transparent" />
    </div>
  );
}
