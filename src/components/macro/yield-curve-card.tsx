"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { Panel } from "@/components/layout/page-header";
import type { YieldPoint } from "@/lib/macro/build-tape";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { fontSize: 10, fill: "#8b93a1", tickLine: false };
const grid = { stroke: "rgba(255,255,255,0.06)" };

export function YieldCurveCard({
  india,
  us,
}: {
  india: YieldPoint[];
  us: YieldPoint[];
}) {
  const chartData = india.map((p, i) => ({
    tenor: p.label,
    india: p.value,
    us: us[i]?.value ?? null,
  }));

  return (
    <Panel
      title="Yield curve"
      action={
        <Link href="/macro/yields" className="text-xs text-primary hover:underline">
          Full curve →
        </Link>
      }
    >
      <p className="mb-3 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        India government bonds
        <MetricExplainer copyKey="yield_in_10y" />
      </p>
      <ul className="space-y-1 font-mono text-sm">
        {india.map((p) => (
          <li key={p.tenor} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              {p.label}
              <span className="text-border">───</span>
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              {p.value != null ? `${p.value.toFixed(2)}%` : "—"}
              <MetricExplainer copyKey={p.copyKey} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid {...grid} vertical={false} />
            <XAxis dataKey="tenor" {...axis} />
            <YAxis {...axis} width={36} domain={["auto", "auto"]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: "#10151c", border: "1px solid #243040", fontSize: 11 }}
              formatter={(v) => (v != null ? `${Number(v).toFixed(2)}%` : "—")}
            />
            <Line type="monotone" dataKey="india" name="India" stroke="#d4af37" dot strokeWidth={2} />
            <Line type="monotone" dataKey="us" name="US" stroke="#5ec8e8" dot={false} strokeWidth={1.2} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
        US 2Y / 10Y (global capital flows)
        <MetricExplainer copyKey="yield_us_10y" />
      </p>
      <div className="mt-1 flex gap-4 font-mono text-sm">
        <span>
          2Y{" "}
          <strong>{us.find((u) => u.tenor === "2Y")?.value?.toFixed(2) ?? "—"}%</strong>
        </span>
        <span>
          10Y{" "}
          <strong>{us.find((u) => u.tenor === "10Y")?.value?.toFixed(2) ?? "—"}%</strong>
        </span>
      </div>
    </Panel>
  );
}
