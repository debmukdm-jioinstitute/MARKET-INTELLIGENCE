"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { Panel } from "@/components/layout/page-header";
import type { TapeQuote } from "@/lib/macro/build-tape";
import { COMMODITY_TAPE_IDS, COMMODITY_UNIVERSE, formatCommodityPrice } from "@/lib/macro/commodity-universe";
import { cn } from "@/lib/utils";
import Link from "next/link";

const defById = new Map(COMMODITY_UNIVERSE.map((d) => [d.id, d]));

function fmtPrice(id: string, price: number | null) {
  const def = defById.get(id);
  if (def) return formatCommodityPrice(def, price);
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}

export function CommoditiesStrip({ rows }: { rows: TapeQuote[] }) {
  const tapeRows = rows.filter((r) => COMMODITY_TAPE_IDS.has(r.id));
  return (
    <Panel
      title="Commodities"
      action={
        <Link href="/macro/commodities" className="text-sm text-primary hover:underline">
          Dashboard →
        </Link>
      }
    >
      <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {tapeRows.map((r) => (
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
