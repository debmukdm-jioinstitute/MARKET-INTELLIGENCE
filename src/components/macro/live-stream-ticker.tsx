"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { useLiveTicker } from "@/hooks/use-live-ticker";
import type { LiveTickerItem } from "@/lib/macro/build-live-ticker";
import { cn } from "@/lib/utils";
import Link from "next/link";

function fmtPrice(item: LiveTickerItem) {
  if (item.price == null) return null;
  const n = item.price.toLocaleString("en-IN", {
    minimumFractionDigits: item.decimals,
    maximumFractionDigits: item.decimals,
  });
  return `${item.prefix}${n}${item.suffix}`;
}

function TickerCell({ item }: { item: LiveTickerItem }) {
  const price = fmtPrice(item);
  const chg = item.changePct;
  const up = (chg ?? 0) >= 0;

  const body = (
    <span className="inline-flex items-center gap-2 px-4 font-mono text-[11px]">
      <span className="text-muted-foreground">{item.label}</span>
      {price ? (
        <span className="text-foreground tabular-nums">{price}</span>
      ) : (
        <span className="text-muted-foreground/80 italic">Connecting…</span>
      )}
      {chg != null ? (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] tabular-nums",
            up ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300",
          )}
        >
          {up ? "+" : ""}
          {(chg * 100).toFixed(2)}%
        </span>
      ) : null}
      <MetricExplainer copyKey={item.copyKey} />
    </span>
  );

  if (item.href && price) {
    return (
      <Link href={item.href} className="hover:text-primary">
        {body}
      </Link>
    );
  }
  return body;
}

export function LiveStreamTicker() {
  const { data, loading } = useLiveTicker();
  const items = data?.items ?? [];
  const loop = items.length ? [...items, ...items] : [];

  return (
    <div
      className="relative border-b border-border bg-[#050608]/95 text-foreground"
      aria-label="Live market stream"
    >
      <div className="flex h-10 items-stretch">
        <div className="z-10 flex shrink-0 items-center gap-2 border-r border-border bg-[#050608] px-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Live stream
          </span>
          <MetricExplainer copyKey="ticker_stream" />
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {loading && !items.length ? (
            <p className="flex h-full items-center px-4 text-xs text-muted-foreground">Connecting to market data…</p>
          ) : (
            <div
              className="flex h-full w-max items-center animate-[marquee_120s_linear_infinite] hover:[animation-play-state:paused]"
              style={{ willChange: "transform" }}
            >
              {loop.map((item, i) => (
                <TickerCell key={`${item.id}-${i}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
