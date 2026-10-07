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
          "market-card flex flex-col justify-between rounded-[22px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-[28px] text-[#151515] shadow-[3px_3px_0px_#151515]",
          className,
        )}
      >
        <div className="text-muted-foreground text-sm">Select an index to view details.</div>
      </div>
    );
  }

  const direction = getDirection(item.change, item.changePct);

  // Semantic background exclusively for hero: Coral for negative, Mint for positive, Ivory for neutral/unavailable
  const bgClass =
    direction === "down"
      ? "bg-[#FF837C]"
      : direction === "up"
        ? "bg-[#B7F5A3]"
        : "bg-[#FCFCFA]";

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
        "market-card flex flex-col justify-between rounded-[22px] border-[1.5px] border-[#151515] p-[28px] text-[#151515] shadow-[3px_3px_0px_#151515] transition-colors duration-200",
        bgClass,
        className,
      )}
    >
      <div>
        {/* Top: rectangular flag + selected index name */}
        <div className="flex items-center gap-3">
          <CountryFlag country={item.region} isDecorative />
          <h2
            id="hero-index-name"
            className="text-[26px] font-bold tracking-tight text-[#151515] sm:text-[28px]"
          >
            {item.label}
          </h2>
        </div>

        {/* Two-line direction headline */}
        <div className="my-5 flex flex-col text-[72px] font-bold leading-[0.96] tracking-tight text-[#151515] sm:text-[80px] lg:text-[88px]">
          <span>{headline.first}</span>
          <span>{headline.second}</span>
        </div>

        {/* Level, capsule and absolute change */}
        <div className="space-y-3">
          <div className="break-words text-[48px] font-bold tabular-nums tracking-tight text-[#151515] sm:text-[56px] lg:text-[64px]">
            {formatPrice(item.price, item.decimals)}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pale matching capsule with vector icon */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-4 py-1.5 text-[22px] font-bold tabular-nums text-[#151515] sm:text-[26px]"
              aria-label={`Daily change percent: ${formatSignedPct(item.changePct)}`}
            >
              {direction === "down" ? (
                <ArrowDownRight className="size-6 shrink-0 stroke-[2.75]" aria-hidden="true" />
              ) : direction === "up" ? (
                <ArrowUpRight className="size-6 shrink-0 stroke-[2.75]" aria-hidden="true" />
              ) : direction === "flat" ? (
                <Minus className="size-6 shrink-0 stroke-[2.75]" aria-hidden="true" />
              ) : null}
              <span>{formatSignedPct(item.changePct)}</span>
            </div>

            {/* Absolute points change */}
            <div
              className="text-[24px] font-bold tabular-nums text-[#151515] sm:text-[28px]"
              aria-label={`Absolute points change: ${formatSignedPoints(item.change, item.decimals)}`}
            >
              {formatSignedPoints(item.change, item.decimals)}
            </div>
          </div>
        </div>
      </div>

      {/* Subdued divider & country / ticker metadata */}
      <div className="mt-8 border-t border-[#151515]/20 pt-4">
        <div className="text-[15px] font-medium text-[#151515] sm:text-base">
          {item.region} · {item.symbol}
        </div>
        <p className="mt-0.5 text-xs text-[#151515]/80">Compared with previous close.</p>
      </div>
    </article>
  );
}
