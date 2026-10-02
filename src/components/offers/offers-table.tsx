"use client";

import { Panel } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import {
  classifyOfferStatus,
  countOffersByStatus,
  groupOffersByStatus,
  offerStatusLabel,
  OFFER_STATUS_SECTIONS,
  type OfferStatusBucket,
} from "@/lib/feeds/offers/offer-status";
import type { OfferReport, OfferRow } from "@/lib/feeds/offers/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PREFERRED_COLUMNS = [
  "Opening Date",
  "Closing Date",
  "Open Date",
  "Close Date",
  "Issue Open",
  "Issue Close",
  "Record Date",
  "Issue Size (Rs. cr.)",
  "Offer Size (Rs. Cr.)",
  "Buyback Size (Rs. Cr.)",
  "Effective Yield (%)",
  "Issue Price (Rs.)",
  "Floor Price (Rs.)",
  "Credit Rating",
  "Exchange",
  "Type",
];

function columnKeys(rows: OfferRow[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const key of Object.keys(row.fields)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const picked: string[] = [];
  for (const key of PREFERRED_COLUMNS) {
    if (ranked.includes(key)) picked.push(key);
  }
  for (const key of ranked) {
    if (picked.length >= 6) break;
    if (!picked.includes(key)) picked.push(key);
  }
  return picked.slice(0, 6);
}

function statusBadgeClass(bucket: OfferStatusBucket): string {
  switch (bucket) {
    case "open":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
    case "upcoming":
      return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    case "listing":
      return "border-sky-500/35 bg-sky-500/10 text-sky-900 dark:text-sky-100";
    case "closed":
      return "border-border bg-muted/50 text-muted-foreground";
    default:
      return "border-dashed border-border bg-muted/30 text-muted-foreground";
  }
}

function OffersMetrics({ counts, total }: { counts: Record<OfferStatusBucket, number>; total: number }) {
  const tiles = OFFER_STATUS_SECTIONS.filter((s) => counts[s.bucket] > 0);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <div className="bento-stat-tile lg:col-span-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total issues</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
        <p className="mt-1 text-xs text-muted-foreground">Calendar year filter</p>
      </div>
      {tiles.map((s) => (
        <div key={s.bucket} className="bento-stat-tile">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{counts[s.bucket]}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
        </div>
      ))}
    </div>
  );
}

function OffersDataTable({ rows, cols }: { rows: OfferRow[]; cols: string[] }) {
  return (
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
          {rows.map((row) => {
            const bucket = classifyOfferStatus(row);
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
                  <td key={c} className="max-w-[220px] truncate px-3 py-2 tabular-nums text-muted-foreground">
                    {row.fields[c] ?? "—"}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                      statusBadgeClass(bucket),
                    )}
                  >
                    {offerStatusLabel(bucket)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

  const counts = countOffersByStatus(report.rows);
  const groups = groupOffersByStatus(report.rows);
  const cols = columnKeys(report.rows);
  const sections = OFFER_STATUS_SECTIONS.filter((s) => (groups.get(s.bucket)?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        {report.title} · FY {report.year}–{String(report.year + 1).slice(-2)} ·{" "}
        <a href={report.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {report.source.provider}
        </a>{" "}
        · updated {new Date(report.source.asOf).toLocaleString("en-IN")}
      </p>

      <OffersMetrics counts={counts} total={report.rows.length} />

      <div className="space-y-4">
        {sections.map((section) => {
          const sectionRows = groups.get(section.bucket) ?? [];
          return (
            <Panel
              key={section.bucket}
              title={`${section.title} (${sectionRows.length})`}
              subtitle={section.description}
              defaultOpen={section.bucket === "open" || section.bucket === "listing"}
            >
              <OffersDataTable rows={sectionRows} cols={cols} />
            </Panel>
          );
        })}
      </div>

      <Card className="border-dashed p-3 text-xs text-muted-foreground">
        Calendar data from Chittorgarh public reports. Status uses row highlights plus open/close dates (IST). Not
        exchange official — verify dates and terms before applying.
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
