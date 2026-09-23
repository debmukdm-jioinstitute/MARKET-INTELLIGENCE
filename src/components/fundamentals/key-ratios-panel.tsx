"use client";

import { RatioRadar } from "@/components/charts/terminal-charts";
import type { FundamentalsSnapshot } from "@/lib/feeds/fundamentals/types";

export function KeyRatiosPanel({ snapshot }: { snapshot: FundamentalsSnapshot }) {
  const radarData = snapshot.ratios
    .filter((r) => r.companyValue != null && r.sectorValue != null && r.sectorValue !== 0)
    .map((r) => ({
      metric: r.name,
      company: r.companyValue! / r.sectorValue!,
      sector: 1,
    }));

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1">Ratio</th>
            <th className="py-1 text-right">Company</th>
            <th className="py-1 text-right">Sector</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.ratios.map((r) => (
            <tr key={r.name} className="border-t border-border">
              <td className="py-1">{r.name}</td>
              <td className="py-1 text-right">
                {r.companyValue != null ? `${r.companyValue}${r.unitSuffix}` : "—"}
              </td>
              <td className="py-1 text-right text-muted-foreground">
                {r.sectorValue != null ? `${r.sectorValue}${r.unitSuffix}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {radarData.length ? (
        <div className="h-[220px]">
          <RatioRadar data={radarData} />
        </div>
      ) : null}
    </div>
  );
}
