"use client";

/** Hawkish/dovish gauge from zero-shot classification of real RBI headlines. Renders nothing
 * (not an error, not a placeholder) when the HF call fails or no RBI news is available yet. */

import useSWR from "swr";

type StancePayload = {
  available: boolean;
  stance: "hawkish" | "dovish" | "neutral" | null;
  score: number;
  analyzedCount?: number;
  hawkishQuote?: string | null;
  dovishQuote?: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<StancePayload>);

const STANCE_COLOR = {
  hawkish: "text-rose-600 dark:text-rose-400",
  dovish: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-amber-600 dark:text-amber-400",
};

export function RbiStanceGauge() {
  const { data, isLoading } = useSWR<StancePayload>("/api/hf/rbi-stance", fetcher, {
    refreshInterval: 1_800_000,
    revalidateOnFocus: false,
  });

  if (isLoading || !data || !data.available || !data.stance) return null;

  const pct = Math.round(((data.score + 1) / 2) * 100); // -1..1 -> 0..100 (0=dovish, 100=hawkish)
  const quote = data.stance === "hawkish" ? data.hawkishQuote : data.stance === "dovish" ? data.dovishQuote : null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">AI Policy Stance Gauge</h3>
        <span className={`text-xs font-bold uppercase ${STANCE_COLOR[data.stance]}`}>{data.stance}</span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500">
        <div
          className="absolute top-1/2 size-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase text-muted-foreground">
        <span>Dovish</span>
        <span>Neutral</span>
        <span>Hawkish</span>
      </div>
      {quote ? (
        <p className="pt-1 text-xs text-muted-foreground italic">
          Most {data.stance} recent headline: &ldquo;{quote}&rdquo;
        </p>
      ) : null}
      <p className="text-[10px] text-muted-foreground">
        Zero-shot read (BART-large-mnli) of {data.analyzedCount ?? 0} recent RBI headlines — not a calibrated forecast.
      </p>
    </div>
  );
}
