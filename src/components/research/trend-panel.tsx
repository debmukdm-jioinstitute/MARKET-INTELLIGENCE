"use client";

import { Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import type { Candle } from "@/lib/feeds/sources/upstox";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface TrendPanelProps {
  candles: Candle[];
  symbol: string;
}

function calculateEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0]! : values[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function calculateRsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function TrendPanel({ candles, symbol }: TrendPanelProps) {
  const metrics = useMemo(() => {
    if (!candles || candles.length < 15) return null;

    // Ensure chronologically sorted
    const sorted = [...candles].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    const closes = sorted.map((c) => c.close).filter((v) => Number.isFinite(v) && v > 0);
    const highs = sorted.map((c) => c.high).filter((v) => Number.isFinite(v) && v > 0);
    const lows = sorted.map((c) => c.low).filter((v) => Number.isFinite(v) && v > 0);

    const latest = closes[closes.length - 1]!;
    const lastDate = sorted[sorted.length - 1]?.ts ?? null;

    // 1. RSI(14)
    const rsi = calculateRsi14(closes);

    // 2. MACD (12, 26, 9)
    let macdLine: number | null = null;
    let macdSignal: number | null = null;
    let macdHist: number | null = null;

    if (closes.length >= 35) {
      const ema12 = calculateEma(closes, 12);
      const ema26 = calculateEma(closes, 26);
      const macdSeries = ema12.map((v, i) => v - ema26[i]!);
      const signalSeries = calculateEma(macdSeries, 9);
      macdLine = macdSeries[macdSeries.length - 1]!;
      macdSignal = signalSeries[signalSeries.length - 1]!;
      macdHist = macdLine - macdSignal;
    }

    // 3. 200-day Simple Moving Average
    let sma200: number | null = null;
    let vsSma200: number | null = null;
    if (closes.length >= 200) {
      const slice = closes.slice(-200);
      sma200 = slice.reduce((a, b) => a + b, 0) / 200;
      vsSma200 = ((latest - sma200) / sma200) * 100;
    }

    // 4. 50-day Simple Moving Average
    let sma50: number | null = null;
    let vsSma50: number | null = null;
    if (closes.length >= 50) {
      const slice = closes.slice(-50);
      sma50 = slice.reduce((a, b) => a + b, 0) / 50;
      vsSma50 = ((latest - sma50) / sma50) * 100;
    }

    // 5. 52-Week High / Low & Distance
    const yearHigh = Math.max(...highs);
    const yearLow = Math.min(...lows);
    const distFrom52wHigh = ((latest - yearHigh) / yearHigh) * 100;

    return {
      lastDate,
      totalCandles: closes.length,
      latestPrice: latest,
      rsi,
      macdLine,
      macdSignal,
      macdHist,
      sma200,
      vsSma200,
      sma50,
      vsSma50,
      yearHigh,
      yearLow,
      distFrom52wHigh,
    };
  }, [candles]);

  if (!metrics) {
    return (
      <Panel title="Technical Trend & Momentum" subtitle="Momentum indicators computed over historical closes">
        <p className="text-sm text-muted-foreground">
          Insufficient historical candles to compute reliable technical trend metrics for {symbol} (minimum 15 daily closes required).
        </p>
      </Panel>
    );
  }

  const { rsi, macdHist, vsSma200, sma200, distFrom52wHigh, yearHigh, lastDate, totalCandles } = metrics;

  const rsiLabel =
    rsi == null
      ? "—"
      : rsi > 70
        ? "Overbought"
        : rsi < 30
          ? "Oversold"
          : rsi >= 50
            ? "Bullish bias"
            : "Bearish bias";

  const macdLabel =
    macdHist == null
      ? "Calculating"
      : macdHist > 0
        ? "Bullish histogram"
        : "Bearish histogram";

  return (
    <Panel
      title="Technical Trend & Momentum"
      subtitle="Computed client-side across 1-year daily candles. No additional network latency."
      action={
        <span className="text-xs text-muted-foreground">
          {lastDate ? `Session as of ${new Date(lastDate).toLocaleDateString()} (IST · UTC+05:30)` : ""}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* RSI */}
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">RSI (14-Day)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {rsi != null ? rsi.toFixed(1) : "—"}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold",
                  rsi != null && rsi > 70 && "border-amber-500 text-amber-600 bg-amber-500/10",
                  rsi != null && rsi < 30 && "border-rose-500 text-rose-600 bg-rose-500/10",
                  rsi != null && rsi >= 50 && rsi <= 70 && "border-emerald-500 text-emerald-600 bg-emerald-500/10",
                  rsi != null && rsi < 50 && rsi >= 30 && "border-slate-500 text-slate-600",
                )}
              >
                {rsiLabel}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">Wilder-smoothed momentum</span>
          </div>

          {/* MACD */}
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">MACD (12, 26, 9)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  macdHist != null && macdHist >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {macdHist != null ? (macdHist >= 0 ? `+${macdHist.toFixed(2)}` : macdHist.toFixed(2)) : "—"}
              </p>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {macdLabel}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">Signal line delta</span>
          </div>

          {/* 200-day SMA */}
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">200-Day SMA</span>
            <div className="flex items-baseline gap-2 mt-1">
              {vsSma200 != null ? (
                <>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      vsSma200 >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {vsSma200 >= 0 ? "+" : ""}{vsSma200.toFixed(1)}%
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums">₹{sma200?.toFixed(1)}</span>
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Unavailable ({totalCandles}/200 closes)
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              {vsSma200 != null ? (vsSma200 >= 0 ? "Above 200 DMA (Long-term bull)" : "Below 200 DMA (Long-term bear)") : "Requires 200 trading sessions"}
            </span>
          </div>

          {/* Distance from 52-week High */}
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">52-Week High Distance</span>
            <div className="flex items-baseline gap-2 mt-1">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  distFrom52wHigh > -5 ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {distFrom52wHigh.toFixed(1)}%
              </p>
              <span className="text-xs text-muted-foreground tabular-nums">Peak ₹{yearHigh.toFixed(1)}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              {distFrom52wHigh > -3 ? "Near 52-week high breakout" : "Drawdown from 1Y peak"}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
