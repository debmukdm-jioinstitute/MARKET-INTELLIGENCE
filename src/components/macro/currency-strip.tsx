"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { Panel } from "@/components/layout/page-header";
import type { TapeQuote } from "@/lib/macro/build-tape";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function CurrencyStrip({ rows }: { rows: TapeQuote[] }) {
  const priority = rows.filter((r) => r.id === "usd_inr" || r.id === "dxy");
  const rest = rows.filter((r) => r.id !== "usd_inr" && r.id !== "dxy");

  return (
    <Panel
      title="Currency"
      action={
        <Link href="/macro/currency" className="text-xs text-primary hover:underline">
          All pairs →
        </Link>
      }
    >
      <p className="mb-2 text-[10px] text-muted-foreground">Prioritized for Indian markets</p>
      <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
        {priority.map((r) => (
          <CurrencyRow key={r.id} row={r} emphasized />
        ))}
      </div>
      <ul className="mt-3 space-y-1">
        {rest.map((r) => (
          <li key={r.id}>
            <CurrencyRow row={r} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function CurrencyRow({ row, emphasized }: { row: TapeQuote; emphasized?: boolean }) {
  const display =
    row.id === "dxy"
      ? row.price?.toFixed(2)
      : row.id.includes("inr")
        ? `₹${row.price?.toFixed(2) ?? "—"}`
        : row.price?.toFixed(2);

  return (
    <Link
      href={row.href}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-1 py-1 transition hover:bg-muted/50",
        emphasized && "font-medium",
      )}
    >
      <span className="flex items-center gap-1 text-sm">
        {row.label}
        <MetricExplainer copyKey={row.copyKey} />
      </span>
      <span className="flex items-center gap-2 font-mono text-sm tabular-nums">
        {display}
        {row.changePct != null ? (
          <span className={cn("text-xs", row.changePct >= 0 ? "text-rose-400" : "text-emerald-400")}>
            {row.changePct >= 0 ? "+" : ""}
            {(row.changePct * 100).toFixed(2)}%
          </span>
        ) : null}
      </span>
    </Link>
  );
}
