import { feedFetch } from "@/lib/feeds/http";
import { UPSTOX_BASE_URL, upstoxHeaders } from "@/lib/feeds/sources/upstox/client";

export type MarketHoliday = {
  date: string;
  description: string;
  closedExchanges: string[];
};

type UpstoxHolidayRow = {
  date: string;
  description: string;
  holiday_type?: string;
  closed_exchanges?: string[];
};

type UpstoxHolidaysResponse = {
  status: string;
  data?: UpstoxHolidayRow[];
};

export async function fetchUpstoxMarketHolidays(): Promise<MarketHoliday[]> {
  const headers = upstoxHeaders();
  if (!headers) return [];

  const url = `${UPSTOX_BASE_URL}/v2/market/holidays`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox market holidays HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxHolidaysResponse;
  if (json.status !== "success" || !json.data) return [];

  return json.data.map((h) => ({
    date: h.date,
    description: h.description,
    closedExchanges: h.closed_exchanges ?? [],
  }));
}

/** True when today is an NSE trading holiday, per Upstox's holiday calendar. */
export function isMarketHolidayToday(holidays: MarketHoliday[]): MarketHoliday | null {
  const today = new Date().toISOString().slice(0, 10);
  return holidays.find((h) => h.date === today) ?? null;
}

export function nextMarketHoliday(holidays: MarketHoliday[]): MarketHoliday | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}
