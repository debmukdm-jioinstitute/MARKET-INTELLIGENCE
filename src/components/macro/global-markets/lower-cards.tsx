"use client";

import { ArrowRight, BarChart2, Star } from "lucide-react";
import type { WorldIndexQuote } from "./types";
import {
  computeRangePosition,
  formatLargeVolume,
  formatPrice,
} from "./utils";
import { cn } from "@/lib/utils";

interface LowerCardsProps {
  item: WorldIndexQuote | null;
  isWatchlisted: boolean;
  onToggleWatchlist: () => void;
  onOpenOverview: () => void;
  className?: string;
}

export function LowerCards({
  item,
  isWatchlisted,
  onToggleWatchlist,
  onOpenOverview,
  className,
}: LowerCardsProps) {
  if (!item) {
    return (
      <div className={cn("metrics-bento", className)}>
        <div className="market-card h-[165px] rounded-[20px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-6 text-sm text-[#62656B]">
          No index selected
        </div>
      </div>
    );
  }

  const dayRange = computeRangePosition(item.price, item.dayLow, item.dayHigh);
  const week52Range = computeRangePosition(item.price, item.week52Low, item.week52High);
  const volumeInfo = formatLargeVolume(item.volume);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Three equal-height LIGHT cards */}
      <div className="metrics-bento">
        {/* Card 1: Day Range (37% width) */}
        <section
          aria-labelledby="day-range-heading"
          className="market-card flex min-h-[165px] flex-col justify-between rounded-[20px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-6 text-[#151515]"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3
                id="day-range-heading"
                className="text-[20px] font-bold tracking-tight text-[#151515] sm:text-[22px]"
              >
                {item.label} day range
              </h3>
              {dayRange.isOutside ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  Quote outside range
                </span>
              ) : null}
            </div>

            {/* Low and High numbers */}
            <div className="mt-2 flex items-baseline justify-between text-[20px] font-bold tabular-nums text-[#151515] sm:text-[24px]">
              <div>
                <span className="mr-1.5 text-xs font-medium text-[#62656B]">Low</span>
                <span>{formatPrice(item.dayLow, item.decimals)}</span>
              </div>
              <div className="text-right">
                <span className="mr-1.5 text-xs font-medium text-[#62656B]">High</span>
                <span>{formatPrice(item.dayHigh, item.decimals)}</span>
              </div>
            </div>

            {/* Neutral slim rail with dark circular marker */}
            <div className="my-3">
              {dayRange.valid && dayRange.pct != null ? (
                <div
                  role="meter"
                  aria-label={`${item.label} today range position`}
                  aria-valuemin={item.dayLow ?? undefined}
                  aria-valuemax={item.dayHigh ?? undefined}
                  aria-valuenow={item.price ?? undefined}
                  aria-valuetext={`Current price ${item.price} is at ${dayRange.pct.toFixed(0)}% of today's range`}
                  className="relative h-2 w-full rounded-full bg-[#E5E5E1]"
                >
                  <span
                    style={{ left: `${dayRange.pct}%` }}
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#151515] shadow-sm transition-all duration-200"
                  />
                </div>
              ) : (
                <div className="py-1 text-center text-xs text-[#62656B]">
                  Today&apos;s range data unavailable
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-[#62656B]">Current value within today’s range.</p>
        </section>

        {/* Card 2: Trading Volume (24% width) - LIGHT CARD */}
        <section
          aria-labelledby="volume-heading"
          className="market-card flex min-h-[165px] flex-col justify-between rounded-[20px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-6 text-[#151515]"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3
                id="volume-heading"
                className="text-[20px] font-bold tracking-tight text-[#151515] sm:text-[22px]"
              >
                {item.label} volume
              </h3>
              <BarChart2 className="size-5 text-[#62656B]" aria-hidden="true" />
            </div>

            {/* Visible Large Dark Trading Volume on Light Card */}
            <div className="mt-2">
              <div className="text-[36px] font-bold tabular-nums tracking-tight text-[#151515] sm:text-[44px] lg:text-[48px]">
                {volumeInfo.short}
              </div>
              <div className="text-sm font-medium text-[#62656B]">
                {volumeInfo.long}
              </div>
            </div>
          </div>

          <p className="text-xs text-[#62656B]">Reported aggregate trading volume.</p>
        </section>

        {/* Card 3: 52-Week Range (39% width) */}
        <section
          aria-labelledby="week52-range-heading"
          className="market-card flex min-h-[165px] flex-col justify-between rounded-[20px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-6 text-[#151515]"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3
                id="week52-range-heading"
                className="text-[20px] font-bold tracking-tight text-[#151515] sm:text-[22px]"
              >
                {item.label} · 52-week range
              </h3>
              {week52Range.isOutside ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  Quote outside yearly range
                </span>
              ) : null}
            </div>

            {/* 52-week endpoints */}
            <div className="mt-2 flex items-baseline justify-between text-[20px] font-bold tabular-nums text-[#151515] sm:text-[24px]">
              <div>
                <span className="mr-1.5 text-xs font-medium text-[#62656B]">52W Low</span>
                <span>{formatPrice(item.week52Low, item.decimals)}</span>
              </div>
              <div className="text-right">
                <span className="mr-1.5 text-xs font-medium text-[#62656B]">52W High</span>
                <span>{formatPrice(item.week52High, item.decimals)}</span>
              </div>
            </div>

            {/* Neutral slim rail with dark circular marker */}
            <div className="my-3">
              {week52Range.valid && week52Range.pct != null ? (
                <div
                  role="meter"
                  aria-label={`${item.label} 52-week range position`}
                  aria-valuemin={item.week52Low ?? undefined}
                  aria-valuemax={item.week52High ?? undefined}
                  aria-valuenow={item.price ?? undefined}
                  aria-valuetext={`Current price ${item.price} is at ${week52Range.pct.toFixed(0)}% of yearly range`}
                  className="relative h-2 w-full rounded-full bg-[#E5E5E1]"
                >
                  <span
                    style={{ left: `${week52Range.pct}%` }}
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#151515] shadow-sm transition-all duration-200"
                  />
                </div>
              ) : (
                <div className="py-1 text-center text-xs text-[#62656B]">
                  52-week range data unavailable
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-[#62656B]">Current value within the yearly range.</p>
        </section>
      </div>

      {/* Slim bottom action strip aligned right */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onToggleWatchlist}
          aria-pressed={isWatchlisted}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] px-5 py-2 text-sm font-bold text-[#151515] shadow-2xs transition-all hover:bg-[#F6F5F1] active:scale-95"
        >
          <Star
            className={cn(
              "size-4 stroke-[2.25]",
              isWatchlisted ? "fill-[#151515] text-[#151515]" : "text-[#151515]",
            )}
          />
          <span>{isWatchlisted ? "In watchlist" : "Add to watchlist"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenOverview}
          className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#151515] px-5 py-2 text-sm font-bold text-white shadow-2xs transition-all hover:bg-black active:scale-95"
        >
          <span>Open overview</span>
          <ArrowRight className="size-4 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
