export type ReportRecencyItem = {
  published_at?: string | null;
  scraped_at?: string | null;
  recommendation?: string | null;
};

export type ReportRecencyBucket = "today" | "week" | "month" | "archive";

export const REPORT_RECENCY_SECTIONS: {
  bucket: ReportRecencyBucket;
  title: string;
  description: string;
}[] = [
  { bucket: "today", title: "Today", description: "Published or ingested in the last 24 hours (IST)." },
  { bucket: "week", title: "This week", description: "Reports from the past 7 days — still actionable context." },
  { bucket: "month", title: "This month", description: "Notes from the last 30 days." },
  { bucket: "archive", title: "Archive", description: "Older than 30 days — reference only." },
];

function startOfIstDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return Date.UTC(y, m - 1, d);
}

export function reportEffectiveDate(row: ReportRecencyItem): Date | null {
  const iso = row.published_at ?? row.scraped_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function classifyReportRecency(row: ReportRecencyItem, now = new Date()): ReportRecencyBucket {
  const when = reportEffectiveDate(row);
  if (!when) return "archive";

  const ageMs = now.getTime() - when.getTime();
  if (ageMs < 0) return "today";

  const todayStart = startOfIstDay(now);
  const reportDay = startOfIstDay(when);
  const dayMs = 86_400_000;

  if (reportDay >= todayStart - dayMs) return "today";
  if (ageMs <= 7 * dayMs) return "week";
  if (ageMs <= 30 * dayMs) return "month";
  return "archive";
}

export function recencySectionLabel(bucket: ReportRecencyBucket): string {
  return REPORT_RECENCY_SECTIONS.find((s) => s.bucket === bucket)?.title ?? "Archive";
}

export function countReportsByRecency(
  rows: ReportRecencyItem[],
  now = new Date(),
): Record<ReportRecencyBucket, number> {
  const counts: Record<ReportRecencyBucket, number> = { today: 0, week: 0, month: 0, archive: 0 };
  for (const row of rows) counts[classifyReportRecency(row, now)] += 1;
  return counts;
}

function sortKey(row: ReportRecencyItem): number {
  const d = reportEffectiveDate(row);
  return d ? d.getTime() : 0;
}

export function sortReportsInRecencyBucket<T extends ReportRecencyItem>(rows: T[]): T[] {
  return [...rows].sort((a, b) => sortKey(b) - sortKey(a));
}

export function groupReportsByRecency<T extends ReportRecencyItem>(
  rows: T[],
  now = new Date(),
): Map<ReportRecencyBucket, T[]> {
  const groups = new Map<ReportRecencyBucket, T[]>();
  for (const def of REPORT_RECENCY_SECTIONS) groups.set(def.bucket, []);
  for (const row of rows) {
    groups.get(classifyReportRecency(row, now))!.push(row);
  }
  for (const def of REPORT_RECENCY_SECTIONS) {
    groups.set(def.bucket, sortReportsInRecencyBucket(groups.get(def.bucket) ?? []));
  }
  return groups;
}

export type ReportRecoBucket = "buy" | "hold" | "sell" | "unrated";

export function classifyReportReco(row: ReportRecencyItem): ReportRecoBucket {
  const raw = row.recommendation?.trim().toUpperCase();
  if (!raw) return "unrated";
  if (raw === "BUY" || raw === "STRONG BUY" || raw === "ACCUMULATE" || raw === "ADD") return "buy";
  if (raw === "SELL" || raw === "REDUCE" || raw === "UNDERWEIGHT") return "sell";
  if (raw === "HOLD" || raw === "NEUTRAL" || raw === "MARKET PERFORM") return "hold";
  if (/BUY|ACCUMULATE|OUTPERFORM|OVERWEIGHT/.test(raw)) return "buy";
  if (/SELL|UNDERWEIGHT|REDUCE|AVOID/.test(raw)) return "sell";
  return "hold";
}

export function countReportsByReco(rows: ReportRecencyItem[]): Record<ReportRecoBucket, number> {
  const counts: Record<ReportRecoBucket, number> = { buy: 0, hold: 0, sell: 0, unrated: 0 };
  for (const row of rows) counts[classifyReportReco(row)] += 1;
  return counts;
}
