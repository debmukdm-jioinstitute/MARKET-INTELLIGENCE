"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { Panel } from "@/components/layout/page-header";
import type { TapeQuote } from "@/lib/macro/build-tape";
import { cn } from "@/lib/utils";
import Link from "next/link";

function fmtPrice(id: string, price: number | null) {
  if (price == null) return "—";
  if (id === "gold") return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (id === "copper") return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}

export function CommoditiesStrip({ rows }: { rows: TapeQuote[] }) {
  return (
    <Panel
      title="Commodities"
      action={
        <Link href="/macro/commodities" className="text-sm text-primary hover:underline">
          Dashboard →
        </Link>
      }
    >
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="flex items-center justify-between gap-2 rounded-md px-1 py-1 transition hover:bg-muted/50"
            >
              <span className="flex items-center gap-1 text-sm tracking-wide text-muted-foreground">
                {r.label}
                <MetricExplainer copyKey={r.copyKey} />
              </span>
              <span className="flex items-center gap-3 text-sm tabular-nums">
                <span>{fmtPrice(r.id, r.price)}</span>
                <span
                  className={cn(
                    "text-sm",
                    (r.changePct ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {r.changePct != null
                    ? `${r.changePct >= 0 ? "+" : ""}${(r.changePct * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
