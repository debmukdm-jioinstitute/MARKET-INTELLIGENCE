"use client";

import { useMarketStatus } from "@/hooks/use-market-status";
import { formatHolidayShort, nextNseOpenLabel } from "@/lib/market/nse-session-label";
import { cn } from "@/lib/utils";

export function MarketStatusBadge() {
  const { isOpen, todayHoliday, nextHoliday, istNow } = useMarketStatus();

  if (isOpen) {
    return (
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-sm">
        <span className="size-1.5 rounded-full bg-emerald-600" />
        <span className="font-medium text-foreground">The market is open</span>
      </div>
    );
  }

  const reopen = todayHoliday ? "back on the next trading day" : nextNseOpenLabel(istNow);

  return (
    <div className="mb-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border px-3 py-1 text-sm">
      <span className={cn("size-1.5 rounded-full bg-muted-foreground")} />
      <span className="font-medium text-foreground">
        Market closed · {reopen}.
      </span>
      {nextHoliday && !todayHoliday ? (
        <span className="text-muted-foreground">
          Next holiday: {nextHoliday.description}, {formatHolidayShort(nextHoliday.date)}
        </span>
      ) : null}
      {todayHoliday ? (
        <span className="text-muted-foreground">Today: {todayHoliday.description}</span>
      ) : null}
    </div>
  );
}
