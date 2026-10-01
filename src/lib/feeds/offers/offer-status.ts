import type { OfferRow } from "@/lib/feeds/offers/types";

export type OfferStatusBucket = "open" | "upcoming" | "listing" | "closed" | "unknown";

export const OFFER_STATUS_SECTIONS: {
  bucket: OfferStatusBucket;
  title: string;
  description: string;
}[] = [
  { bucket: "open", title: "Open now", description: "Accepting applications or bids in the current window." },
  { bucket: "listing", title: "Listing today", description: "Expected listing or allotment day." },
  { bucket: "upcoming", title: "Upcoming", description: "Not open yet — watch dates before applying." },
  { bucket: "closed", title: "Closed", description: "Window ended; historical reference for the year." },
  { bucket: "unknown", title: "Other", description: "Status unclear from source — verify on Chittorgarh." },
];

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const OPEN_FIELD_KEYS = [
  "Opening Date",
  "Open Date",
  "Issue Open Date",
  "Bid Open Date",
  "Start Date",
  "Record Date",
];

const CLOSE_FIELD_KEYS = [
  "Closing Date",
  "Close Date",
  "Issue Close Date",
  "Bid Close Date",
  "End Date",
  "Last Date",
];

export function offerStatusLabel(bucket: OfferStatusBucket): string {
  const hit = OFFER_STATUS_SECTIONS.find((s) => s.bucket === bucket);
  return hit?.title ?? "Other";
}

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

function parseIndianDateString(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = MONTHS[m[2]!.toLowerCase()];
  const year = Number(m[3]);
  if (mon == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  return new Date(Date.UTC(year, mon, day));
}

function pickDateFromFields(row: OfferRow, keys: string[]): Date | null {
  for (const key of keys) {
    const v = row.fields[key];
    if (v == null || v === "") continue;
    if (typeof v === "number") continue;
    const parsed = parseIndianDateString(String(v));
    if (parsed) return parsed;
  }
  return null;
}

export function parseOfferWindow(row: OfferRow): { open: Date | null; close: Date | null } {
  return {
    open: pickDateFromFields(row, OPEN_FIELD_KEYS),
    close: pickDateFromFields(row, CLOSE_FIELD_KEYS),
  };
}

function statusFromDates(row: OfferRow, now: Date): OfferStatusBucket | null {
  const { open, close } = parseOfferWindow(row);
  if (!open && !close) return null;
  const today = startOfIstDay(now);
  const openMs = open ? startOfIstDay(open) : null;
  const closeMs = close ? startOfIstDay(close) : null;

  if (openMs != null && today < openMs) return "upcoming";
  if (closeMs != null && today > closeMs) return "closed";
  if (openMs != null && closeMs != null && today >= openMs && today <= closeMs) return "open";
  if (openMs != null && closeMs == null && today >= openMs) return "open";
  if (openMs == null && closeMs != null && today <= closeMs) return "open";
  return null;
}

export function classifyOfferStatus(row: OfferRow, now = new Date()): OfferStatusBucket {
  const hint = row.statusHint ?? "";
  if (/color-green/i.test(hint)) return "open";
  if (/color-aqua/i.test(hint)) return "listing";
  if (/color-lightyellow/i.test(hint)) return "upcoming";

  const fromDates = statusFromDates(row, now);
  if (fromDates) return fromDates;

  if (!hint.trim()) return "unknown";
  return "unknown";
}

export function countOffersByStatus(rows: OfferRow[], now = new Date()): Record<OfferStatusBucket, number> {
  const counts: Record<OfferStatusBucket, number> = {
    open: 0,
    upcoming: 0,
    listing: 0,
    closed: 0,
    unknown: 0,
  };
  for (const row of rows) counts[classifyOfferStatus(row, now)] += 1;
  return counts;
}

function windowSortKey(row: OfferRow): number {
  const { open, close } = parseOfferWindow(row);
  const t = close?.getTime() ?? open?.getTime();
  return t ?? Number.MAX_SAFE_INTEGER;
}

export function sortOffersInBucket(rows: OfferRow[], bucket: OfferStatusBucket): OfferRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (bucket === "closed") return windowSortKey(b) - windowSortKey(a);
    return windowSortKey(a) - windowSortKey(b);
  });
  return copy;
}

export function groupOffersByStatus(rows: OfferRow[], now = new Date()): Map<OfferStatusBucket, OfferRow[]> {
  const groups = new Map<OfferStatusBucket, OfferRow[]>();
  for (const def of OFFER_STATUS_SECTIONS) groups.set(def.bucket, []);
  for (const row of rows) {
    const bucket = classifyOfferStatus(row, now);
    groups.get(bucket)!.push(row);
  }
  for (const def of OFFER_STATUS_SECTIONS) {
    groups.set(def.bucket, sortOffersInBucket(groups.get(def.bucket) ?? [], def.bucket));
  }
  return groups;
}
