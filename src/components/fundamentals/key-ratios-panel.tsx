"use client";

import { RatioRadar } from "@/components/charts/terminal-charts";
import { Fold, Takeaway } from "@/components/guide/explain";
import type { FundamentalsSnapshot } from "@/lib/feeds/fundamentals/types";
import { cn } from "@/lib/utils";

const fmt = (v: number | null, u: string) => (v != null ? `${v}${u}` : "—");

/** Company vs sector, in words first, with the full table and radar one tap away. */
export function KeyRatiosPanel({ snapshot }: { snapshot: FundamentalsSnapshot }) {
  const rows = snapshot.ratios.map((r) => {
    const rel = r.companyValue != null && r.sectorValue != null && r.sectorValue !== 0 ? r.companyValue / r.sectorValue - 1 : null;
    return { ...r, rel };
  });
  const comparable = rows.filter((r) => r.rel != null);
  const higher = comparable.filter((r) => (r.rel ?? 0) > 0.1).length;
  const lower = comparable.filter((r) => (r.rel ?? 0) < -0.1).length;
  const radarData = rows
    .filter((r) => r.rel != null)
    .map((r) => ({ metric: r.name, company: r.companyValue! / r.sectorValue!, sector: 1 }));

  return (
    <div className="space-y-5">
      {comparable.length ? (
        <Takeaway tone="info" sub="Higher is not always better: a higher P/E means pricier, a higher margin means more profitable. Read each row below.">
          Compared with its sector, {higher} of {comparable.length} measures are clearly higher and {lower} clearly lower.
        </Takeaway>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.slice(0, 6).map((r) => (
          <li key={r.name} className="rounded-xl border border-border bg-card p-4">
            <p className="text-base font-semibold">{r.name}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{fmt(r.companyValue, r.unitSuffix)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sector: {fmt(r.sectorValue, r.unitSuffix)}
              {r.rel != null ? (
                <span className={cn("ml-2 font-medium", r.rel > 0.1 ? "text-sky-700" : r.rel < -0.1 ? "text-amber-700" : "text-muted-foreground")}>
                  {r.rel > 0.1 ? `${Math.round(r.rel * 100)}% above` : r.rel < -0.1 ? `${Math.round(-r.rel * 100)}% below` : "in line"}
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
      <Fold title="Full table and chart">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1.5">Ratio</th>
              <th className="py-1.5 text-right">Company</th>
              <th className="py-1.5 text-right">Sector</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-border">
                <td className="py-1.5">{r.name}</td>
                <td className="py-1.5 text-right tabular-nums">{fmt(r.companyValue, r.unitSuffix)}</td>
                <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmt(r.sectorValue, r.unitSuffix)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {radarData.length ? (
          <div className="h-[260px]">
            <RatioRadar data={radarData} />
          </div>
        ) : null}
      </Fold>
    </div>
  );
}
