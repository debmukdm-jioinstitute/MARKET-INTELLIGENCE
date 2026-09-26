"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { Panel } from "@/components/layout/page-header";
import type { TapeQuote } from "@/lib/macro/build-tape";
import {
  CURRENCY_TAPE_IDS,
  CURRENCY_UNIVERSE,
  formatCurrencyPrice,
} from "@/lib/macro/currency-universe";
import { cn } from "@/lib/utils";
import Link from "next/link";

const defById = new Map(CURRENCY_UNIVERSE.map((d) => [d.id, d]));

function fmtPrice(id: string, price: number | null) {
  const def = defById.get(id);
  if (def) return formatCurrencyPrice(def, price);
  if (price == null) return "—";
  return price.toFixed(2);
}

export function CurrencyStrip({ rows }: { rows: TapeQuote[] }) {
  const priorityIds = ["usd_inr", "dxy"] as const;
  const tapeRows = rows.filter((r) => CURRENCY_TAPE_IDS.has(r.id));
  const priority = priorityIds
    .map((id) => tapeRows.find((r) => r.id === id))
    .filter((r): r is TapeQuote => Boolean(r));
  const rest = tapeRows.filter((r) => r.id !== "usd_inr" && r.id !== "dxy");

  return (
    <Panel
      title="Currency"
      action={
        <Link href="/macro/currency" className="text-sm text-primary hover:underline">
          Dashboard →
        </Link>
      }
    >
      <p className="mb-2 text-sm text-muted-foreground">Headline pairs for Indian markets</p>
      <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
        {priority.map((r) => (
          <CurrencyRow key={r.id} row={r} emphasized />
        ))}
      </div>
      <ul className="mt-3 max-h-[280px] space-y-1 overflow-y-auto pr-1">
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
      <span className="flex items-center gap-2 text-sm tabular-nums">
        {fmtPrice(row.id, row.price)}
        {row.changePct != null ? (
          <span className={cn("text-sm", row.changePct >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {row.changePct >= 0 ? "+" : ""}
            {(row.changePct * 100).toFixed(2)}%
          </span>
        ) : null}
      </span>
    </Link>
  );
}
