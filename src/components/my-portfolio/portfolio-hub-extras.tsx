"use client";

import { Bars, Donut } from "@/components/charts/terminal-charts";
import { Panel } from "@/components/layout/page-header";
import type { PortfolioAnalysis } from "@/lib/my-portfolio/types";
import Link from "next/link";
import { useMemo } from "react";

export function PortfolioHubExtras({ data }: { data: PortfolioAnalysis }) {
  const sectorSlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data.positions) {
      map.set(p.sector || "Unclassified", (map.get(p.sector || "Unclassified") ?? 0) + p.marketValueInr);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data.positions]);

  const riskBars = (data.riskContribution ?? []).slice(0, 6).map((r) => ({
    name: r.symbol,
    value: r.riskShare,
  }));

  const brinsonTop = (data.sectorAttribution ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 4);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel title="Sector mix" subtitle="Top sectors by market value">
        <div className="h-[220px]">
          {sectorSlices.length ? <Donut data={sectorSlices} /> : null}
        </div>
      </Panel>
      <Panel title="Risk budget" subtitle="Weight × vol share">
        <div className="h-[220px]">
          {riskBars.length ? <Bars data={riskBars} /> : (
            <p className="text-sm text-muted-foreground p-2">Add history for risk contribution.</p>
          )}
        </div>
      </Panel>
      <Panel title="Sector attribution" subtitle="Brinson effects (approx)">
        {brinsonTop.length ? (
          <ul className="space-y-1.5 text-sm">
            {brinsonTop.map((row) => (
              <li key={row.sector} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">{row.sector}</span>
                <span>{(row.total * 100).toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Needs more NAV history.</p>
        )}
        <Link href="/portfolio/attribution" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline">
          Full attribution →
        </Link>
      </Panel>
    </div>
  );
}
