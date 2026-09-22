"use client";

import { cn } from "@/lib/utils";

export function UniversePicker({
  symbols,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  max,
}: {
  symbols: { symbol: string; name: string }[];
  selected: string[];
  onToggle: (symbol: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  max: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Watchlist ({selected.length}/{max} selected)
        </p>
        <div className="flex gap-2 text-[11px] font-medium text-primary">
          <button type="button" onClick={onSelectAll} className="hover:underline">
            Select first {max}
          </button>
          <span className="text-muted-foreground">·</span>
          <button type="button" onClick={onClear} className="hover:underline">
            Clear
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {symbols.map((s) => {
          const isOn = selected.includes(s.symbol);
          return (
            <button
              key={s.symbol}
              type="button"
              onClick={() => onToggle(s.symbol)}
              title={s.name}
              className={cn(
                "flex items-center justify-between rounded-md border px-2 py-1.5 text-left text-[11px] font-mono transition-colors",
                isOn
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}
            >
              <span>{s.symbol}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
