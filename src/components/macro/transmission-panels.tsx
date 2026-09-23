"use client";

import { MetricExplainer } from "@/components/macro/metric-explainer";
import { Panel } from "@/components/layout/page-header";
import type { TransmissionBlock } from "@/lib/macro/build-tape";
import { cn } from "@/lib/utils";
import Link from "next/link";

function dirSymbol(d: "up" | "down" | "mixed") {
  if (d === "up") return "↑";
  if (d === "down") return "↓";
  return "↑/↓";
}

export function TransmissionPanels({
  brent,
  usdInr,
}: {
  brent: TransmissionBlock;
  usdInr: TransmissionBlock;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <TransmissionCard block={brent} />
      <TransmissionCard block={usdInr} />
    </div>
  );
}

function TransmissionCard({ block }: { block: TransmissionBlock }) {
  const chg = block.changePct;
  const priceStr =
    block.unit === "INR"
      ? `₹${block.price?.toFixed(2) ?? "—"}`
      : `$${block.price?.toFixed(2) ?? "—"}`;

  return (
    <Panel title={block.title}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1 text-sm uppercase tracking-wider text-muted-foreground">
            {block.driverLabel}
            <MetricExplainer copyKey={block.copyKey} />
          </p>
          <p className="text-2xl tabular-nums">{priceStr}</p>
          {chg != null ? (
            <p className={cn("text-sm", chg >= 0 ? "text-rose-600" : "text-emerald-600")}>
              {chg >= 0 ? "+" : ""}
              {(chg * 100).toFixed(1)}%
            </p>
          ) : null}
        </div>
        <a
          href={block.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          {block.source.provider}
        </a>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-emerald-600/90">Potential beneficiaries</p>
          <ul className="space-y-1 text-sm">
            {block.beneficiaries.map((r) => (
              <li key={r.name}>
                <ExposureRow row={r} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-rose-600/90">Potential pressure</p>
          <ul className="space-y-1 text-sm">
            {block.pressured.map((r) => (
              <li key={r.name}>
                <ExposureRow row={r} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Rule-based sector map for learning — not a trading recommendation. Click names with links for research.
      </p>
    </Panel>
  );
}

function ExposureRow({ row }: { row: TransmissionBlock["beneficiaries"][0] }) {
  const inner = (
    <span className="flex items-center justify-between gap-2">
      <span>{row.name}</span>
      <span className="text-muted-foreground">{dirSymbol(row.direction)}</span>
    </span>
  );
  if (row.href) {
    return (
      <Link href={row.href} className="block rounded px-1 py-0.5 hover:bg-muted/50 hover:text-primary">
        {inner}
      </Link>
    );
  }
  return <span className="block px-1 py-0.5 text-muted-foreground">{inner}</span>;
}
