"use client";

import { COMMODITY_FOCUS_LABEL, type CommodityFocus } from "@/lib/macro/commodity-universe";
import { cn } from "@/lib/utils";

export type CommodityFocusFilter = "all" | CommodityFocus;

const ORDER: CommodityFocusFilter[] = ["all", "global", "us", "india"];

export function CommodityFocusToggle({
  value,
  onChange,
  counts,
  className,
}: {
  value: CommodityFocusFilter;
  onChange: (next: CommodityFocusFilter) => void;
  counts: Record<CommodityFocusFilter, number>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-sm)]",
        className,
      )}
      role="tablist"
      aria-label="Commodity market focus"
    >
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {ORDER.map((id) => {
          const active = value === id;
          const label =
            id === "all"
              ? "All markets"
              : id === "global"
                ? COMMODITY_FOCUS_LABEL.global
                : id === "us"
                  ? "United States"
                  : "India";
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-left transition-colors sm:text-center",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="block text-sm font-semibold">{label}</span>
              <span className={cn("block text-xs tabular-nums", active ? "text-primary-foreground/90" : "text-muted-foreground")}>
                {counts[id]} instruments
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
