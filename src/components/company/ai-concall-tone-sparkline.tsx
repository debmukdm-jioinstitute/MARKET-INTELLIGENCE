"use client";

/** Real FinBERT-scored confidence-inflection sparkline, distinct from the page's existing
 * curated tone tracker above it. Renders nothing on load/failure — an optional overlay. */

import useSWR from "swr";
import { Sparkles } from "lucide-react";

type Point = { quarter: string; aiScore: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ points: Point[] }>);

export function AiConcallToneSparkline({ symbol }: { symbol: string }) {
  const { data } = useSWR(`/api/hf/concall-tone?symbol=${encodeURIComponent(symbol)}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 1_800_000,
  });

  const points = data?.points ?? [];
  if (points.length < 2) return null;

  const w = 240;
  const h = 40;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - (p.aiScore / 100) * h).toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        AI confidence read (FinBERT, independent of the tracker above)
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full max-w-[280px]" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
        {points.map((p, i) => (
          <circle key={p.quarter} cx={i * step} cy={h - (p.aiScore / 100) * h} r={2.5} className="fill-primary" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {points.map((p) => (
          <span key={p.quarter}>{p.quarter}</span>
        ))}
      </div>
    </div>
  );
}
