"use client";

import { Card } from "@/components/ui/card";
import type { OfferReport, OfferRow } from "@/lib/feeds/offers/types";
import Link from "next/link";

function statusLabel(hint: string | null): string | null {
  if (!hint) return null;
  if (/color-green/i.test(hint)) return "Open";
  if (/color-lightyellow/i.test(hint)) return "Upcoming";
  if (/color-aqua/i.test(hint)) return "Listing today";
  return null;
}

function columnKeys(rows: OfferRow[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const key of Object.keys(row.fields)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);
}

export function OffersTable({ report, loading }: { report?: OfferReport; loading: boolean }) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading Chittorgarh data…</p>;
  }
  if (!report) {
    return <p className="text-sm text-muted-foreground">No report loaded.</p>;
  }
  if (!report.rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No rows for {report.title} ({report.year}). Source may be empty —{" "}
        <a href={report.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          view on Chittorgarh
        </a>
        .
      </p>
    );
  }

  const cols = columnKeys(report.rows);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {report.rows.length} issues ·{" "}
        <a href={report.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {report.source.provider}
        </a>{" "}
        · updated {new Date(report.source.asOf).toLocaleString("en-IN")}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Company</th>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2">
                  {c}
                </th>
              ))}
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => {
              const badge = statusLabel(row.statusHint);
              return (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-medium">
                    {row.detailUrl ? (
                      <a
                        href={row.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {row.name}
                      </a>
                    ) : (
                      row.name
                    )}
                  </td>
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 tabular-nums text-muted-foreground">
                      {row.fields[c] ?? "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs">{badge ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Card className="border-dashed p-3 text-xs text-muted-foreground">
        Calendar data from Chittorgarh public reports. Not exchange official; verify dates and terms before applying.
      </Card>
    </div>
  );
}

export function OffersHubLinks() {
  return (
    <p className="text-sm text-muted-foreground">
      Also see{" "}
      <Link href="/research/ipo" className="font-medium text-primary hover:underline">
        IPO tracker (Upstox + GMP)
      </Link>
      .
    </p>
  );
}
