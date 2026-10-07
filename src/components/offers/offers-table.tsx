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
import { RefreshCw } from "lucide-react";
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
    <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
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

function OfferCards({ rows, cols }: { rows: OfferRow[]; cols: string[] }) {
  return (
    <div className="grid gap-2 md:hidden">
      {rows.map((row) => {
        const bucket = classifyOfferStatus(row);
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-semibold text-foreground">{row.name}</p>
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
                  statusBadgeClass(bucket),
                )}
              >
                {offerStatusLabel(bucket)}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {cols.map((c) => {
                const v = row.fields[c];
                return (
                  <div key={c} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{c}</dt>
                    <dd
                      className="truncate text-sm font-medium tabular-nums text-foreground"
                      title={v == null ? undefined : String(v)}
                    >
                      {v ?? "—"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </>
        );
        return row.detailUrl ? (
          <a
            key={row.id}
            href={row.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block min-h-[44px] w-full rounded-xl border border-border bg-card p-4 active:bg-muted/50"
          >
            {body}
          </a>
        ) : (
          <div key={row.id} className="rounded-xl border border-border bg-card p-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function OffersTable({
  report,
  loading,
  isValidating,
  onRefresh,
}: {
  report?: OfferReport;
  loading: boolean;
  isValidating?: boolean;
  onRefresh?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-card/40 p-12 text-center">
        <RefreshCw className="mb-3 size-6 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Pulling fresh Chittorgarh calendar data…</p>
        <p className="mt-1 text-xs text-muted-foreground">Connecting to live feed and parsing issue schedules</p>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="rounded-xl border border-border/80 bg-card/40 p-8 text-center text-sm text-muted-foreground">
        No report loaded.
      </div>
    );
  }
  if (!report.rows.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-card/40 p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          No rows for {report.title} ({report.year}). Source may be empty or awaiting updates.
        </p>
        <div className="flex items-center justify-center gap-3">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="size-3.5" />
              Pull fresh data
            </button>
          )}
          <a
            href={report.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View on Chittorgarh
          </a>
        </div>
      </div>
    );
  }

  const counts = countOffersByStatus(report.rows);
  const groups = groupOffersByStatus(report.rows);
  const cols = columnKeys(report.rows);
  const sections = OFFER_STATUS_SECTIONS.filter((s) => (groups.get(s.bucket)?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      {isValidating && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-primary/20">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {report.title} · FY {report.year}–{String(report.year + 1).slice(-2)} ·{" "}
          <a
            href={report.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {report.source.provider}
          </a>{" "}
          · Synced {new Date(report.source.asOf).toLocaleString("en-IN")}
        </p>
        {isValidating && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            <RefreshCw className="size-3 animate-spin" />
            Pulling fresh updates…
          </span>
        )}
      </div>

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
              <OfferCards rows={sectionRows} cols={cols} />
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
