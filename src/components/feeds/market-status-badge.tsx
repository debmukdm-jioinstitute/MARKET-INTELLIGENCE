"use client";

import { useMarketStatus } from "@/hooks/use-market-status";
import { cn } from "@/lib/utils";

export function MarketStatusBadge() {
  const { isOpen, todayHoliday, nextHoliday } = useMarketStatus();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
      <span className={cn("size-1.5 rounded-full", isOpen ? "bg-emerald-400" : "bg-muted-foreground")} />
      <span className="font-medium">
        NSE {isOpen ? "open" : "closed"}
        {todayHoliday ? ` — ${todayHoliday.description}` : ""}
      </span>
      {!todayHoliday && nextHoliday ? (
        <span className="text-muted-foreground">
          · Next holiday {nextHoliday.date} ({nextHoliday.description})
        </span>
      ) : null}
    </div>
  );
}
