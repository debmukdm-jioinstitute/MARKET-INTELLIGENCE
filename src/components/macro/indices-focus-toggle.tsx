"use client";

import { INDEX_FOCUS_LABEL, type IndexFocus } from "@/lib/macro/indices-universe";
import { cn } from "@/lib/utils";

export type IndexFocusFilter = "all" | IndexFocus;

const ORDER: IndexFocusFilter[] = ["all", "americas", "europe", "asia", "india"];

export function IndicesFocusToggle({
  value,
  onChange,
  counts,
  className,
}: {
  value: IndexFocusFilter;
  onChange: (next: IndexFocusFilter) => void;
  counts: Record<IndexFocusFilter, number>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-sm)]",
        className,
      )}
      role="tablist"
      aria-label="World indices region focus"
    >
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
        {ORDER.map((id) => {
          const active = value === id;
          const label =
            id === "all"
              ? "All regions"
              : id === "asia"
                ? INDEX_FOCUS_LABEL.asia
                : INDEX_FOCUS_LABEL[id];
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
              <span
                className={cn(
                  "block text-xs tabular-nums",
                  active ? "text-primary-foreground/90" : "text-muted-foreground",
                )}
              >
                {counts[id]} indices
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
