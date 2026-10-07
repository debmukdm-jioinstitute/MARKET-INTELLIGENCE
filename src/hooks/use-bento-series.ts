"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { BentoTf, SeriesPoint } from "@/lib/price-bento/model";

type RawCandle = { ts?: string; date?: string; open?: number; high?: number; low?: number; close?: number; value?: number };
type CandlesResponse = { candles?: RawCandle[]; source?: "upstox" | "yahoo" };

const fetchCandles = async (url: string): Promise<CandlesResponse> => {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json as CandlesResponse;
};

function toSeries(c: CandlesResponse | undefined): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const r of c?.candles ?? []) {
    const t = Date.parse(String(r.ts ?? r.date ?? ""));
    const v = r.close ?? r.value;
    if (Number.isFinite(t) && typeof v === "number" && Number.isFinite(v)) out.push({ t, v });
  }
  return out.sort((a, b) => a.t - b.t);
}

const DAYS: Record<BentoTf, number> = { "1D": 1, "1W": 7, "1M": 31, "1Y": 366 };

/** Slice a daily history (e.g. Yahoo/US detail) to a bento range. 1D is not derivable from daily data. */
export function sliceDaily(history: { date: string; value: number }[] | undefined, tf: BentoTf): SeriesPoint[] {
  if (!history?.length || tf === "1D") return [];
  const pts = history
    .map((h) => ({ t: Date.parse(h.date), v: h.value }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
  if (!pts.length) return [];
  const cutoff = pts[pts.length - 1].t - DAYS[tf] * 86_400_000;
  const out = pts.filter((p) => p.t >= cutoff);
  return out.length >= 2 ? out : pts.slice(-2);
}

/**
 * Real price series for the Price Bento.
 *  - `candleSymbol` (Upstox-resolvable index key / NSE symbol): intraday for 1D, daily otherwise.
 *  - `dailyFallback`: used for ranges when there is no candle symbol (e.g. US names, indices without Upstox keys).
 * Also exposes the session low/high derived from the 1D candles (independent of the selected range).
 */
export function useBentoSeries({
  candleSymbol,
  dailyFallback,
  tf,
}: {
  candleSymbol: string | null | undefined;
  dailyFallback?: { date: string; value: number }[];
  tf: BentoTf;
}) {
  const base = candleSymbol ? `/api/feeds/upstox/candles?symbol=${encodeURIComponent(candleSymbol)}` : null;

  const day = useSWR(base ? `${base}&range=1D` : null, fetchCandles, { revalidateOnFocus: false, dedupingInterval: 30_000 });
  const rng = useSWR(base && tf !== "1D" ? `${base}&range=${tf}` : null, fetchCandles, { revalidateOnFocus: false, dedupingInterval: 120_000 });

  const dayCandles = day.data?.candles;
  const dayRange = useMemo(() => {
    let low = Infinity;
    let high = -Infinity;
    for (const c of dayCandles ?? []) {
      const lo = c.low ?? c.close;
      const hi = c.high ?? c.close;
      if (typeof lo === "number" && lo < low) low = lo;
      if (typeof hi === "number" && hi > high) high = hi;
    }
    return Number.isFinite(low) && Number.isFinite(high) ? { low, high } : null;
  }, [dayCandles]);

  const q = tf === "1D" ? day : rng;
  const candleSeries = useMemo(() => toSeries(q.data), [q.data]);
  const fallbackSeries = useMemo(() => (base ? [] : sliceDaily(dailyFallback, tf)), [base, dailyFallback, tf]);
  const series = base ? candleSeries : fallbackSeries;

  return {
    series,
    loading: base ? q.isLoading : false,
    error: base && q.error ? (q.error instanceof Error ? q.error.message : "Failed to load") : null,
    retry: () => {
      void day.mutate();
      void rng.mutate();
    },
    dayRange,
    source: base ? (q.data?.source === "yahoo" ? "Yahoo Finance" : q.data?.source === "upstox" ? "Upstox" : null) : dailyFallback?.length ? "Yahoo Finance" : null,
  };
}
