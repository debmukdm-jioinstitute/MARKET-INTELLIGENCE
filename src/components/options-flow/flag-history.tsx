"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, CalendarDays, Flag, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CONFIDENCE_STYLE } from "./types";

type FlagLogRow = {
  flagged_date: string;
  symbol: string;
  headline: string;
  confidence: string;
  price_at_flag: number | null;
};

function monthKey(isoDate: string): string {
  // flagged_date is YYYY-MM-DD
  return isoDate.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

/**
 * The flag log, visualized as an honest hit-rate tracker: every flag ever logged,
 * grouped over time, with the confidence mix and the price at the time of the flag.
 * A flag is a reason to look, not a prediction — so "hit rate" here means "how often
 * looking into a flag surfaced something real", and the log keeps the misses too.
 */
export function FlagHistory() {
  const [flags, setFlags] = useState<FlagLogRow[]>([]);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/options-flow/history")
      .then((r) => r.json())
      .then((json) => {
        setFlags(json.flags ?? []);
        setDbConfigured(json.dbConfigured !== false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const byMonth = new Map<string, number>();
    const confCount = { low: 0, medium: 0, high: 0 } as Record<string, number>;
    const tickers = new Set<string>();
    for (const f of flags) {
      byMonth.set(monthKey(f.flagged_date), (byMonth.get(monthKey(f.flagged_date)) ?? 0) + 1);
      tickers.add(f.symbol);
      const c = f.confidence.toLowerCase();
      if (c in confCount) confCount[c] += 1;
    }
    const months = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12);
    const max = Math.max(1, ...months.map(([, n]) => n));
    return { total: flags.length, tickers: tickers.size, months, max, confCount };
  }, [flags]);

  if (!dbConfigured) {
    return (
      <p className="text-sm text-muted-foreground">
        No database configured — flag history needs DATABASE_URL / POSTGRES_URL set to log runs over time.
      </p>
    );
  }
  if (loading) {
    return (
      <div className="space-y-2" aria-live="polite">
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        <p className="text-sm text-muted-foreground">Loading flag log…</p>
      </div>
    );
  }
  if (flags.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <Flag className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">No flags logged yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run the screener above to start building a track record. Every flag gets logged here automatically —
          the ones that led somewhere and the ones that didn’t.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flag className="size-3.5" /> Flags logged
          </p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="size-3.5" /> Tickers flagged
          </p>
          <p className="mt-1 text-2xl font-bold">{stats.tickers}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" /> Months tracked
          </p>
          <p className="mt-1 text-2xl font-bold">{stats.months.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="text-xs text-muted-foreground">Confidence mix</p>
          <p className="mt-1 flex flex-wrap gap-1">
            {(["high", "medium", "low"] as const).map((c) =>
              stats.confCount[c] > 0 ? (
                <Badge key={c} className={cn("uppercase", CONFIDENCE_STYLE[c])}>
                  {c} · {stats.confCount[c]}
                </Badge>
              ) : null,
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        <h3 className="text-sm font-bold">Flags over time</h3>
        <p className="text-xs text-muted-foreground">Last {stats.months.length} months · showing the 60 most recent logged flags</p>
        <div className="mt-3 flex h-28 items-end gap-1.5" role="img" aria-label={`Bar chart of flags per month, ${stats.total} flags total`}>
          {stats.months.map(([key, n]) => (
            <div key={key} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${monthLabel(key)}: ${n} flag${n === 1 ? "" : "s"}`}>
              <span className="text-xs font-semibold text-blue-700">{n}</span>
              <div
                className="w-full rounded-t bg-blue-600/70"
                style={{ height: `${Math.max(6, (n / stats.max) * 100)}%` }}
              />
              <span className="text-[10px] text-muted-foreground">{monthLabel(key)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-blue-600/30 bg-blue-600/[0.04] p-4">
        <h3 className="text-sm font-bold text-blue-800">How to score your own hit rate</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A flag is a reason to research, not a prediction — so there’s no automatic “win” or “loss”. A flag was
          worth it if looking into it surfaced something real: news, an event, or a move you’d otherwise have
          missed. Misses count too: this log keeps every flag so your memory can’t cherry-pick only the ones
          that worked.
        </p>
      </div>

      <div className="space-y-2">
        {flags.map((f) => (
          <article key={`${f.flagged_date}-${f.symbol}`} className="rounded-xl border border-border bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{f.symbol}</span>
                <Badge className={cn("uppercase", CONFIDENCE_STYLE[f.confidence.toLowerCase() as "low" | "medium" | "high"] ?? "bg-muted text-muted-foreground")}>
                  {f.confidence}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{f.flagged_date}</span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.headline}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Price at flag:{" "}
                <span className="font-semibold text-foreground">
                  {f.price_at_flag != null ? `₹${f.price_at_flag.toFixed(2)}` : "—"}
                </span>
              </p>
              <Link
                href={`/research/${encodeURIComponent(f.symbol)}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
              >
                Check how this one turned out
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
