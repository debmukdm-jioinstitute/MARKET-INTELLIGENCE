"use client";

import { ALGO_CHART } from "@/lib/ai-trader/algo-brand";
import { toISTTime } from "@/lib/ai-trader/time";
import type { JourneyPoint } from "@/lib/ai-trader/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";

const axisTick = { fontSize: 9, fill: ALGO_CHART.axisFill };

export function AlgoJourneyChart({
  journey,
  entryPremium,
  initialSl,
  target,
  symbol,
}: {
  journey: JourneyPoint[];
  entryPremium: number;
  initialSl: number;
  target: number;
  symbol: string;
}) {
  if (journey.length < 2) {
    return <p className="py-2 text-sm text-muted-foreground">Not enough data points.</p>;
  }

  const data = journey.map((pt, i) => ({
    ...pt,
    premium: pt.option_price ?? pt.premium ?? 0,
    time: pt.ts.length > 10 ? toISTTime(pt.ts) : `Bar ${i}`,
    entry: entryPremium,
  }));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{symbol} journey</span>
        <span>{journey.length} points</span>
        <span className="text-primary">Entry ₹{entryPremium}</span>
        <span className="text-destructive">SL ₹{initialSl.toFixed(1)}</span>
        <span className="text-chart-2">Target ₹{target.toFixed(1)}</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={ALGO_CHART.grid} />
          <XAxis dataKey="time" tick={axisTick} interval="preserveStartEnd" />
          <YAxis domain={["auto", "auto"]} tick={axisTick} width={50} />
          <Tooltip
            contentStyle={ALGO_CHART.tooltip}
            formatter={(val: unknown, name: unknown) => [`₹${Number(val).toFixed(2)}`, String(name)]}
          />
          <ReferenceLine y={entryPremium} stroke={ALGO_CHART.line.primary} strokeDasharray="4 2" label={{ value: "Entry", fill: ALGO_CHART.line.primary, fontSize: 9 }} />
          <ReferenceLine y={initialSl} stroke={ALGO_CHART.line.down} strokeDasharray="4 2" label={{ value: "SL", fill: ALGO_CHART.line.down, fontSize: 9 }} />
          <ReferenceLine y={target} stroke={ALGO_CHART.line.up} strokeDasharray="4 2" label={{ value: "TGT", fill: ALGO_CHART.line.up, fontSize: 9 }} />
          <Line type="monotone" dataKey="premium" stroke={ALGO_CHART.line.warn} dot={false} strokeWidth={2} name="Option ₹" />
          <Line type="stepAfter" dataKey="sl" stroke={ALGO_CHART.line.accent} dot={false} strokeWidth={1} strokeDasharray="3 2" name="Live SL" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
