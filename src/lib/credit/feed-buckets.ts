import type { CreditFeedItem, CreditEventAction } from "@/lib/credit/types";

export type CreditActionBucket =
  | "upgrade"
  | "downgrade"
  | "outlook"
  | "watch"
  | "default_restruct"
  | "other";

export const CREDIT_ACTION_SECTIONS: {
  bucket: CreditActionBucket;
  title: string;
  description: string;
}[] = [
  { bucket: "upgrade", title: "Upgrades", description: "Assigned higher ratings or positive revisions." },
  { bucket: "downgrade", title: "Downgrades", description: "Lower ratings — spread and equity risk watch." },
  { bucket: "outlook", title: "Outlook changes", description: "Stable / positive / negative outlook moves." },
  { bucket: "watch", title: "Watch & review", description: "Rating watch, under review, reaffirmations." },
  { bucket: "default_restruct", title: "Default & restructuring", description: "Distress, default, or restructuring signals." },
  { bucket: "other", title: "Other rating releases", description: "New assignments and general rating rationale." },
];

export type CreditRecencyBucket = "today" | "week" | "month" | "archive";

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

export function classifyCreditRecency(item: CreditFeedItem, now = new Date()): CreditRecencyBucket {
  const when = new Date(`${item.actionDate}T12:00:00.000Z`);
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

export function classifyCreditActionBucket(item: CreditFeedItem): CreditActionBucket {
  const a: CreditEventAction | "RATING_ACTION" = item.action;
  if (a === "RATING_UPGRADE") return "upgrade";
  if (a === "RATING_DOWNGRADE") return "downgrade";
  if (a === "OUTLOOK_CHANGE") return "outlook";
  if (a === "CREDIT_WATCH" || a === "LIQUIDITY_CONCERN") return "watch";
  if (a === "DEFAULT" || a === "DEBT_RESTRUCTURING") return "default_restruct";
  return "other";
}

export function countCreditRecency(items: CreditFeedItem[], now = new Date()) {
  const counts = { today: 0, week: 0, month: 0, archive: 0 };
  for (const item of items) counts[classifyCreditRecency(item, now)] += 1;
  return counts;
}

export function countCreditActionBuckets(items: CreditFeedItem[]) {
  const counts: Record<CreditActionBucket, number> = {
    upgrade: 0,
    downgrade: 0,
    outlook: 0,
    watch: 0,
    default_restruct: 0,
    other: 0,
  };
  for (const item of items) counts[classifyCreditActionBucket(item)] += 1;
  return counts;
}

export function groupCreditByAction(items: CreditFeedItem[]): Map<CreditActionBucket, CreditFeedItem[]> {
  const groups = new Map<CreditActionBucket, CreditFeedItem[]>();
  for (const def of CREDIT_ACTION_SECTIONS) groups.set(def.bucket, []);
  for (const item of items) groups.get(classifyCreditActionBucket(item))!.push(item);
  for (const [k, rows] of groups) {
    groups.set(
      k,
      [...rows].sort((a, b) => b.actionDate.localeCompare(a.actionDate)),
    );
  }
  return groups;
}
