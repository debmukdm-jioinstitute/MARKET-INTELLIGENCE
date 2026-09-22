import { feedFetch } from "@/lib/feeds/http";
import { UPSTOX_BASE_URL, upstoxHeaders } from "@/lib/feeds/sources/upstox/client";

export type CorporateActionEvent = {
  name: string;
  exDate: string;
  amount: number | null;
  ratio: string | null;
  details: { name: string; value: string }[];
};

type UpstoxCorporateActionRow = {
  name: string;
  expiry_date: string;
  amount: number | null;
  ratio: string | null;
  event_details?: { name: string; value: string }[];
};

type UpstoxCorporateActionsResponse = {
  status: string;
  data?: UpstoxCorporateActionRow[];
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Upstox dates come as "14 Aug 2025" — parsed as a calendar date (UTC midnight), not via the Date constructor's locale-dependent parsing. */
export function parseUpstoxDate(text: string): Date | null {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2]!.toLowerCase()];
  const year = Number(m[3]);
  if (month == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  return new Date(Date.UTC(year, month, day));
}

/** Fetch corporate actions (dividends, bonus, splits, rights) for a company by ISIN. Upstox does not expose an earnings-date calendar — this covers everything Upstox's fundamentals API actually provides. */
export async function fetchUpstoxCorporateActions(isin: string): Promise<CorporateActionEvent[] | null> {
  const headers = upstoxHeaders();
  if (!headers) return null;

  const url = `${UPSTOX_BASE_URL}/v2/fundamentals/${encodeURIComponent(isin)}/corporate-actions`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox corporate actions HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxCorporateActionsResponse;
  if (json.status !== "success" || !json.data) return null;

  return json.data.map((row) => ({
    name: row.name,
    exDate: row.expiry_date,
    amount: row.amount ?? null,
    ratio: row.ratio ?? null,
    details: row.event_details ?? [],
  }));
}

/** Events whose ex-date falls within [today, today + windowDays]. */
export function upcomingCorporateActions(
  events: CorporateActionEvent[],
  windowDays = 30,
  from: Date = new Date(),
): CorporateActionEvent[] {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = start + windowDays * 86_400_000;
  return events.filter((e) => {
    const d = parseUpstoxDate(e.exDate);
    if (!d) return false;
    const t = d.getTime();
    return t >= start && t <= end;
  });
}
