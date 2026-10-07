"use client";

import { ArrowDown, ArrowUp, Minus, X } from "lucide-react";
import { useEffect } from "react";
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

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorldIndexQuote[];
  onRemoveItem: (id: string) => void;
}

export function ComparisonModal({
  isOpen,
  onClose,
  items,
  onRemoveItem,
}: ComparisonModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="market-card max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[24px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-6 text-[#151515] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#151515]/15 pb-4">
          <div className="flex items-center gap-3">
            <h2 id="compare-dialog-title" className="text-2xl font-bold tracking-tight">
              Compare Indices
            </h2>
            <span className="rounded-full bg-[#151515] px-2.5 py-0.5 text-xs font-bold text-white">
              {items.length} selected
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison view"
            className="inline-flex size-8 items-center justify-center rounded-full hover:bg-black/10 active:scale-95"
          >
            <X className="size-5" />
          </button>
        </div>

        {items.length < 2 ? (
          <div className="py-12 text-center text-sm text-[#62656B]">
            Select at least 2 indices to view a side-by-side comparison.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${items.length}, minmax(220px, 1fr))`,
              }}
            >
              {items.map((item) => {
                const dayRange = computeRangePosition(item.price, item.dayLow, item.dayHigh);
                const week52Range = computeRangePosition(item.price, item.week52Low, item.week52High);
                const volume = formatLargeVolume(item.volume);
                const isNeg = item.changePct != null && item.changePct < 0;
                const isPos = item.changePct != null && item.changePct > 0;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-[18px] border border-[#151515]/20 bg-white p-5 shadow-xs"
                  >
                    <div>
                      {/* Top flag + name + remove */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CountryFlag country={item.region} isDecorative />
                          <div>
                            <h3 className="text-base font-bold leading-tight text-[#151515]">
                              {item.label}
                            </h3>
                            <p className="text-xs text-[#62656B]">
                              {item.region} · {item.symbol}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${item.label} from comparison`}
                          className="text-[#62656B] hover:text-[#151515]"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {/* Daily Change % */}
                      <div className="mt-4">
                        <span className="text-xs font-semibold text-[#62656B]">Daily change %</span>
                        <div
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold tabular-nums",
                            isNeg && "bg-rose-100 text-[#A52F38]",
                            isPos && "bg-emerald-100 text-[#26713D]",
                            !isNeg && !isPos && "bg-gray-100 text-[#151515]",
                          )}
                        >
                          {isNeg ? (
                            <ArrowDown className="size-3.5 stroke-[3]" />
                          ) : isPos ? (
                            <ArrowUp className="size-3.5 stroke-[3]" />
                          ) : (
                            <Minus className="size-3.5 stroke-[3]" />
                          )}
                          <span>{formatSignedPct(item.changePct)}</span>
                        </div>
                      </div>

                      {/* Current Level & Points Change */}
                      <div className="mt-3">
                        <span className="text-xs font-semibold text-[#62656B]">Index level</span>
                        <div className="text-xl font-bold tabular-nums text-[#151515]">
                          {formatPrice(item.price, item.decimals)}
                        </div>
                        <div className="text-xs font-medium tabular-nums text-[#62656B]">
                          {formatSignedPoints(item.change, item.decimals)}
                        </div>
                      </div>

                      {/* Day Range */}
                      <div className="mt-4 border-t border-[#151515]/10 pt-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#62656B]">
                          <span>Day range</span>
                          {dayRange.pct != null ? <span>{dayRange.pct.toFixed(0)}%</span> : null}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between text-xs font-bold tabular-nums text-[#151515]">
                          <span>{formatPrice(item.dayLow, item.decimals)}</span>
                          <span>{formatPrice(item.dayHigh, item.decimals)}</span>
                        </div>
                        {dayRange.valid && dayRange.pct != null ? (
                          <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-[#E5E5E1]">
                            <span
                              style={{ left: `${dayRange.pct}%` }}
                              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#151515]"
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* 52-Week Range */}
                      <div className="mt-3 border-t border-[#151515]/10 pt-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#62656B]">
                          <span>52-Week range</span>
                          {week52Range.pct != null ? <span>{week52Range.pct.toFixed(0)}%</span> : null}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between text-xs font-bold tabular-nums text-[#151515]">
                          <span>{formatPrice(item.week52Low, item.decimals)}</span>
                          <span>{formatPrice(item.week52High, item.decimals)}</span>
                        </div>
                        {week52Range.valid && week52Range.pct != null ? (
                          <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-[#E5E5E1]">
                            <span
                              style={{ left: `${week52Range.pct}%` }}
                              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#151515]"
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* Trading Volume */}
                      <div className="mt-3 border-t border-[#151515]/10 pt-3">
                        <span className="text-xs font-semibold text-[#62656B]">Trading volume</span>
                        <div className="text-base font-bold tabular-nums text-[#151515]">
                          {volume.short}
                        </div>
                        <div className="text-xs text-[#62656B]">{volume.long}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[#151515]/10 pt-4 text-xs text-[#62656B]">
          <span>Direct comparison of same-field metrics (not compound return returns).</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#151515] bg-[#151515] px-4 py-1.5 text-xs font-bold text-white hover:bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
