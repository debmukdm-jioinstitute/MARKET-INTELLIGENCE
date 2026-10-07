"use client";

import { ExternalLink, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Lines } from "@/components/charts/terminal-charts";
import { CountryFlag } from "./country-flag";
import type { WorldIndexQuote } from "./types";
import {
  computeRangePosition,
  formatLargeVolume,
  formatPrice,
  formatSignedPct,
  formatSignedPoints,
} from "./utils";
import { cn } from "@/lib/utils";

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorldIndexQuote | null;
  isWatchlisted: boolean;
  onToggleWatchlist: () => void;
}

export function OverviewModal({
  isOpen,
  onClose,
  item,
  isWatchlisted,
  onToggleWatchlist,
}: OverviewModalProps) {
  const [chartData, setChartData] = useState<{ date: string; v: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch 6-month history for the selected index
  useEffect(() => {
    if (!isOpen || !item?.symbol) return;
    let cancelled = false;
    setChartLoading(true);
    setChartData([]);

    (async () => {
      try {
        const res = await fetch(
          `/api/feeds/yahoo/history?symbol=${encodeURIComponent(item.symbol)}&range=6mo`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as { points?: { date: string; value: number }[] };
        if (cancelled) return;
        if (json.points) {
          setChartData(json.points.map((p) => ({ date: p.date, v: p.value })));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, item?.symbol]);

  if (!isOpen || !item) return null;

  const dayRange = computeRangePosition(item.price, item.dayLow, item.dayHigh);
  const week52Range = computeRangePosition(item.price, item.week52Low, item.week52High);
  const volumeInfo = formatLargeVolume(item.volume);
  const isNeg = item.changePct != null && item.changePct < 0;
  const isPos = item.changePct != null && item.changePct > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="overview-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="market-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[24px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-6 text-[#151515] shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#151515]/15 pb-4">
          <div className="flex items-center gap-3">
            <CountryFlag country={item.region} isDecorative />
            <div>
              <h2
                id="overview-dialog-title"
                className="text-2xl font-bold tracking-tight text-[#151515] sm:text-3xl"
              >
                {item.label}
              </h2>
              <p className="text-sm text-[#62656B]">
                {item.region} · {item.symbol} · Benchmark equity index
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close index overview"
            className="inline-flex size-8 items-center justify-center rounded-full hover:bg-black/10 active:scale-95"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Level and Change Summary */}
        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <div className="text-3xl font-bold tabular-nums text-[#151515] sm:text-4xl">
              {formatPrice(item.price, item.decimals)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "font-bold tabular-nums",
                  isNeg && "text-[#A52F38]",
                  isPos && "text-[#26713D]",
                  !isNeg && !isPos && "text-[#151515]",
                )}
              >
                {formatSignedPct(item.changePct)}
              </span>
              <span className="text-[#62656B]">
                ({formatSignedPoints(item.change, item.decimals)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleWatchlist}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#151515] px-4 py-1.5 text-xs font-bold transition-all hover:bg-black/5"
            >
              <Star
                className={cn(
                  "size-3.5",
                  isWatchlisted ? "fill-[#151515] text-[#151515]" : "text-[#151515]",
                )}
              />
              <span>{isWatchlisted ? "In Watchlist" : "Add to Watchlist"}</span>
            </button>
            <a
              href={item.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#151515] underline hover:text-black"
            >
              <span>Yahoo Finance</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        {/* 6-Month Chart */}
        <div className="mt-6 rounded-2xl border border-[#151515]/15 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#62656B]">6-Month Price Trend</span>
            {chartLoading ? (
              <span className="text-xs text-[#62656B]">Loading chart data…</span>
            ) : null}
          </div>
          <div className="h-[220px]">
            {chartData.length > 0 ? (
              <Lines
                data={chartData}
                keys={[{ key: "v", color: "#151515", name: item.label }]}
              />
            ) : !chartLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-[#62656B]">
                Historical chart unavailable for this symbol.
              </div>
            ) : null}
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {/* Day Range */}
          <div className="rounded-xl border border-[#151515]/15 bg-white p-4">
            <span className="text-xs font-semibold text-[#62656B]">Day Range</span>
            <div className="mt-1 flex items-baseline justify-between text-sm font-bold tabular-nums text-[#151515]">
              <span>{formatPrice(item.dayLow, item.decimals)}</span>
              <span>{formatPrice(item.dayHigh, item.decimals)}</span>
            </div>
            {dayRange.valid && dayRange.pct != null ? (
              <div className="relative mt-2 h-1.5 w-full rounded-full bg-[#E5E5E1]">
                <span
                  style={{ left: `${dayRange.pct}%` }}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#151515]"
                />
              </div>
            ) : null}
          </div>

          {/* Volume */}
          <div className="rounded-xl border border-[#151515]/15 bg-white p-4">
            <span className="text-xs font-semibold text-[#62656B]">Trading Volume</span>
            <div className="mt-1 text-lg font-bold tabular-nums text-[#151515]">
              {volumeInfo.short}
            </div>
            <div className="text-xs text-[#62656B]">{volumeInfo.long}</div>
          </div>

          {/* 52-Week Range */}
          <div className="rounded-xl border border-[#151515]/15 bg-white p-4">
            <span className="text-xs font-semibold text-[#62656B]">52-Week Range</span>
            <div className="mt-1 flex items-baseline justify-between text-sm font-bold tabular-nums text-[#151515]">
              <span>{formatPrice(item.week52Low, item.decimals)}</span>
              <span>{formatPrice(item.week52High, item.decimals)}</span>
            </div>
            {week52Range.valid && week52Range.pct != null ? (
              <div className="relative mt-2 h-1.5 w-full rounded-full bg-[#E5E5E1]">
                <span
                  style={{ left: `${week52Range.pct}%` }}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#151515]"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer info & close */}
        <div className="mt-6 flex items-center justify-between border-t border-[#151515]/10 pt-4 text-xs text-[#62656B]">
          <span>Provider: {item.source.provider}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#151515] bg-[#151515] px-5 py-1.5 text-xs font-bold text-white hover:bg-black"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
