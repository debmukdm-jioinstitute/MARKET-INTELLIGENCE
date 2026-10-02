"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function BreakoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}
function BounceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5c0 8 4 14 8 14s8-6 8-14" />
      <path d="M17 8l3 2-3 2" />
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M5 20v-6M10 20V9M15 20v-9M20 20V5" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 19h4l3-5 4 2 4-7 3 2" />
    </svg>
  );
}

const PRESETS: { id: string; title: string; blurb: string; meaning: string; icon: ReactNode; accent: string }[] = [
  {
    id: "high52w",
    title: "Breakouts",
    blurb: "Stocks closing at their highest price in a year.",
    meaning: "Strong momentum — but chasing highs can sting on pullbacks.",
    icon: <BreakoutIcon />,
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "rsi-oversold",
    title: "Oversold bounces",
    blurb: "Stocks that fell fast and hard (RSI below 30).",
    meaning: "A watchlist for possible relief rallies — not a buy signal.",
    icon: <BounceIcon />,
    accent: "bg-sky-100 text-sky-700",
  },
  {
    id: "volume-gainers",
    title: "Volume spikes",
    blurb: "Price up with far more shares traded than usual.",
    meaning: "Unusual activity often means big investors are moving.",
    icon: <VolumeIcon />,
    accent: "bg-violet-100 text-violet-700",
  },
  {
    id: "up2pct-3d",
    title: "Fresh trends",
    blurb: "Climbing three sessions in a row, up 2% or more.",
    meaning: "Short, clean uptrends — check whether volume backs them.",
    icon: <TrendIcon />,
    accent: "bg-amber-100 text-amber-700",
  },
];

export function ScanPresets({
  matchesById,
  active,
  onPick,
}: {
  /** scanner id → match count (empty while loading or for guests). */
  matchesById: Map<string, number>;
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-base font-bold text-foreground">What are you looking for?</p>
      <p className="mt-0.5 text-sm text-muted-foreground">Four plain-English starting points. Pros: every scan is also in the full list below.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PRESETS.map((p) => {
          const isActive = active === p.id;
          const matches = matchesById.get(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              aria-pressed={isActive}
              className={cn(
                "group rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                isActive ? "border-blue-600 ring-2 ring-blue-600/20" : "border-stone-200",
              )}
            >
              <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl", p.accent)}>{p.icon}</span>
              <span className="mt-2.5 block text-sm font-bold text-foreground">{p.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{p.blurb}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground/80 italic">{p.meaning}</span>
              <span
                className={cn(
                  "mt-2.5 inline-block rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                  isActive ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-600",
                )}
              >
                {matches == null ? "…" : `${matches} match${matches === 1 ? "" : "es"}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
