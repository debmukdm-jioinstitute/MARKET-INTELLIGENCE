import type { PromoterFeedItem } from "@/lib/promoters/feed-types";
import type { PromoterActivityType } from "@/lib/promoters/types";

export type PromoterActionBucket = "buying" | "selling" | "pledge" | "bulk_block" | "other";

export type PromoterRecencyBucket = "today" | "week" | "month" | "archive";

export const PROMOTER_ACTION_SECTIONS: {
  bucket: PromoterActionBucket;
  title: string;
  description: string;
}[] = [
  { bucket: "buying", title: "Buying & accumulation", description: "Promoter or insider purchase signals." },
  { bucket: "selling", title: "Selling & disposal", description: "Promoter/insider stake sales and exits." },
  { bucket: "pledge", title: "Pledge & release", description: "Share pledge create/increase or release." },
  { bucket: "bulk_block", title: "Bulk & block deals", description: "Exchange bulk/block window activity." },
  { bucket: "other", title: "Other disclosures", description: "SAST, SHP, and general filings." },
];

const RECENCY_TILES: { bucket: PromoterRecencyBucket; title: string; description: string }[] = [
  { bucket: "today", title: "Today", description: "Last 24h (IST)." },
  { bucket: "week", title: "This week", description: "Past 7 days." },
  { bucket: "month", title: "This month", description: "Past 30 days." },
  { bucket: "archive", title: "Archive", description: "Older than 30 days." },
];

export { RECENCY_TILES as PROMOTER_RECENCY_TILES };

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

export function classifyPromoterRecency(item: PromoterFeedItem, now = new Date()): PromoterRecencyBucket {
  const when = new Date(`${item.transactionDate}T12:00:00.000Z`);
  if (Number.isNaN(when.getTime())) return "archive";
  const ageMs = now.getTime() - when.getTime();
  const dayMs = 86_400_000;
  const todayStart = startOfIstDay(now);
  const reportDay = startOfIstDay(when);
  if (reportDay >= todayStart - dayMs) return "today";
  if (ageMs <= 7 * dayMs) return "week";
  if (ageMs <= 30 * dayMs) return "month";
  return "archive";
}

const BUY: PromoterActivityType[] = ["PROMOTER_BUYING", "INSIDER_BUYING"];
const SELL: PromoterActivityType[] = ["PROMOTER_SELLING", "INSIDER_SELLING"];
const PLEDGE: PromoterActivityType[] = ["PLEDGE_INCREASE", "PLEDGE_DECREASE"];
const BULK: PromoterActivityType[] = ["BLOCK_DEAL", "BULK_DEAL"];

export function classifyPromoterActionBucket(item: PromoterFeedItem): PromoterActionBucket {
  if (item.category === "DISCLOSURE") return "other";
  if (BUY.includes(item.category)) return "buying";
  if (SELL.includes(item.category)) return "selling";
  if (PLEDGE.includes(item.category)) return "pledge";
  if (BULK.includes(item.category)) return "bulk_block";
  return "other";
}

export function countPromoterRecency(items: PromoterFeedItem[], now = new Date()) {
  const counts = { today: 0, week: 0, month: 0, archive: 0 };
  for (const item of items) counts[classifyPromoterRecency(item, now)] += 1;
  return counts;
}

export function countPromoterActionBuckets(items: PromoterFeedItem[]) {
  const counts: Record<PromoterActionBucket, number> = {
    buying: 0,
    selling: 0,
    pledge: 0,
    bulk_block: 0,
    other: 0,
  };
  for (const item of items) counts[classifyPromoterActionBucket(item)] += 1;
  return counts;
}

export function groupPromoterByAction(items: PromoterFeedItem[]): Map<PromoterActionBucket, PromoterFeedItem[]> {
  const groups = new Map<PromoterActionBucket, PromoterFeedItem[]>();
  for (const def of PROMOTER_ACTION_SECTIONS) groups.set(def.bucket, []);
  for (const item of items) groups.get(classifyPromoterActionBucket(item))!.push(item);
  for (const [k, rows] of groups) {
    groups.set(k, [...rows].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)));
  }
  return groups;
}
