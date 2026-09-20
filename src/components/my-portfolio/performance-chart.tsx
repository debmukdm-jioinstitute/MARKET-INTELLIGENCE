"use client";

import { NavChart } from "@/components/charts/terminal-charts";
import { useMemo, useState } from "react";

const RANGES = ["1M", "3M", "6M", "1Y", "SI"] as const;
type Range = (typeof RANGES)[number];

const RANGE_DAYS: Record<Range, number> = { "1M": 21, "3M": 63, "6M": 126, "1Y": 252, SI: Infinity };

export function PerformanceChart({
  data,
  benchmarkLabel,
}: {
  data: { date: string; portfolio: number; benchmark: number }[];
  benchmarkLabel: string;
}) {
  const [range, setRange] = useState<Range>("SI");
  const sliced = useMemo(() => {
    const days = RANGE_DAYS[range];
    return Number.isFinite(days) ? data.slice(-days) : data;
  }, [data, range]);

  if (!data.length) {
    return <p className="p-4 text-sm text-muted-foreground">Add a holding to see performance history.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded px-2 py-0.5 font-mono text-[11px] ${
              range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="h-[280px]">
        <NavChart data={sliced} aKey="portfolio" bKey="benchmark" bName={benchmarkLabel} />
      </div>
    </div>
  );
}
