"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { Panel } from "@/components/layout/page-header";
import type { WorldIndexQuote } from "@/lib/macro/build-world-indices";
import {
  INDEX_TAPE_IDS,
  INDEX_UNIVERSE,
  formatIndexPrice,
} from "@/lib/macro/indices-universe";
import { cn } from "@/lib/utils";
import Link from "next/link";

const defById = new Map(INDEX_UNIVERSE.map((d) => [d.id, d]));

export function IndicesStrip({ rows }: { rows: WorldIndexQuote[] }) {
  const tapeRows = rows.filter((r) => INDEX_TAPE_IDS.has(r.id));
  const priorityIds = ["nifty", "spx"] as const;
  const priority = priorityIds
    .map((id) => tapeRows.find((r) => r.id === id))
    .filter((r): r is WorldIndexQuote => Boolean(r));
  const rest = tapeRows.filter((r) => r.id !== "nifty" && r.id !== "spx");

  return (
    <Panel
      title="World indices"
      action={
        <Link href="/macro/indices" className="text-sm text-primary hover:underline">
          Dashboard →
        </Link>
      }
    >
      <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
        {priority.map((r) => (
          <IndexRow key={r.id} row={r} emphasized />
        ))}
      </div>
      <ul className="mt-3 max-h-[280px] space-y-1 overflow-y-auto pr-1">
        {rest.map((r) => (
          <li key={r.id}>
            <IndexRow row={r} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function IndexRow({ row, emphasized }: { row: WorldIndexQuote; emphasized?: boolean }) {
  const def = defById.get(row.id);
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
        {def ? formatIndexPrice(def, row.price) : row.price?.toFixed(2) ?? "—"}
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
