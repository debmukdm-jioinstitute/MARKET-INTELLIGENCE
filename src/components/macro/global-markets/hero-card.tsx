"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CountryFlag } from "./country-flag";
import type { WorldIndexQuote } from "./types";
import {
  formatPrice,
  formatSignedPct,
  formatSignedPoints,
  getDirection,
} from "./utils";
import { cn } from "@/lib/utils";

interface HeroCardProps {
  item: WorldIndexQuote | null;
  className?: string;
}

export function HeroCard({ item, className }: HeroCardProps) {
  if (!item) {
    return (
      <div
        className={cn(
          "market-card flex flex-col justify-between rounded-[22px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-5 text-[#151515] shadow-[3px_3px_0px_#151515]",
          className,
        )}
      >
        <div className="text-muted-foreground text-sm">Select an index to view details.</div>
      </div>
    );
  }

  const direction = getDirection(item.change, item.changePct);

  // Semantic background: Light green for positive change, Light red for negative change, Ivory for flat/unavailable
  const bgClass =
    direction === "down"
      ? "bg-[#FEE2E2]" // Light red
      : direction === "up"
        ? "bg-[#DCFCE7]" // Light green
        : "bg-[#FCFCFA]"; // Ivory neutral

  const headline =
    direction === "down"
      ? { first: "Lower", second: "today." }
      : direction === "up"
        ? { first: "Higher", second: "today." }
        : direction === "flat"
          ? { first: "Unchanged", second: "today." }
          : { first: "Quote", second: "pending." };

  return (
    <article
      aria-labelledby="hero-index-name"
      className={cn(
        "market-card flex flex-col justify-between rounded-[22px] border-[1.5px] border-[#151515] p-4 sm:p-4.5 lg:p-5 text-[#151515] shadow-[3px_3px_0px_#151515] transition-colors duration-200",
        bgClass,
        className,
      )}
    >
      <div>
        {/* Top: rectangular flag + selected index name */}
        <div className="flex items-center gap-2.5">
          <CountryFlag country={item.region} isDecorative />
          <h2
            id="hero-index-name"
            className="text-[17px] font-bold tracking-tight text-[#151515] sm:text-[19px] lg:text-[20px]"
          >
            {item.label}
          </h2>
        </div>

        {/* Two-line direction headline */}
        <div className="my-1.5 sm:my-2 flex flex-col text-[32px] font-bold leading-[0.96] tracking-tight text-[#151515] sm:text-[38px] lg:text-[42px]">
          <span>{headline.first}</span>
          <span>{headline.second}</span>
        </div>

        {/* Level, capsule and absolute change */}
        <div className="space-y-2">
          <div className="break-words text-[28px] font-bold tabular-nums tracking-tight text-[#151515] sm:text-[32px] lg:text-[36px]">
            {formatPrice(item.price, item.decimals)}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pale matching capsule with vector icon */}
            <div
              className="inline-flex items-center gap-1 rounded-full border border-black/5 bg-black/5 px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#151515] sm:text-[13px]"
              aria-label={`Daily change percent: ${formatSignedPct(item.changePct)}`}
            >
              {direction === "down" ? (
                <ArrowDownRight className="size-4 shrink-0 stroke-[2.75]" aria-hidden="true" />
              ) : direction === "up" ? (
                <ArrowUpRight className="size-4 shrink-0 stroke-[2.75]" aria-hidden="true" />
              ) : direction === "flat" ? (
                <Minus className="size-4 shrink-0 stroke-[2.75]" aria-hidden="true" />
              ) : null}
              <span>{formatSignedPct(item.changePct)}</span>
            </div>

            {/* Absolute points change */}
            <div
              className="text-xs font-bold tabular-nums text-[#151515] sm:text-[13px]"
              aria-label={`Absolute points change: ${formatSignedPoints(item.change, item.decimals)}`}
            >
              {formatSignedPoints(item.change, item.decimals)}
            </div>
          </div>
        </div>
      </div>

      {/* Subdued divider & country / ticker metadata */}
      <div className="mt-2.5 border-t border-[#151515]/15 pt-2">
        <div className="text-[12px] font-semibold text-[#151515] sm:text-[13px]">
          {item.region} · {item.symbol}
        </div>
        <p className="mt-0.5 text-[10.5px] text-[#151515]/75">Compared with previous close.</p>
      </div>
    </article>
  );
}
