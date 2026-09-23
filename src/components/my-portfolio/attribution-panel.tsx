"use client";

import { cn } from "@/lib/utils";

export function AttributionPanel({
  attribution,
}: {
  attribution: { symbol: string; name: string; contributionPct: number }[];
}) {
  if (!attribution.length) {
    return <p className="text-sm text-muted-foreground">Add a holding to see return attribution.</p>;
  }
  return (
    <div className="space-y-1.5 text-sm">
      {attribution.map((row) => (
        <div key={row.symbol} className="flex items-center justify-between">
          <span className="text-muted-foreground">{row.symbol}</span>
          <span className={cn("font-mono", row.contributionPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {row.contributionPct >= 0 ? "+" : ""}
            {(row.contributionPct * 100).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
