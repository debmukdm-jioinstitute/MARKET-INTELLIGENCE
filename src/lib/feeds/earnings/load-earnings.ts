import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { fetchYahooEarningsDate } from "@/lib/feeds/sources/yahoo-calendar";

export type EarningsRow = { symbol: string; name: string; date: string; isEstimate: boolean };

const TTL_MS = 6 * 60 * 60 * 1000;
let cache: { at: number; rows: EarningsRow[]; failed: number } | null = null;

export async function loadEarningsRows(force = false): Promise<{ asOf: string; rows: EarningsRow[]; failed: number }> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    return { asOf: new Date(cache.at).toISOString(), rows: cache.rows, failed: cache.failed };
  }
  const results = await Promise.allSettled(INDIA_EQUITIES.map((i) => fetchYahooEarningsDate(i.symbol)));
  const rows: EarningsRow[] = [];
  let failed = 0;
  results.forEach((r, idx) => {
    if (r.status === "rejected") failed++;
    else if (r.value) {
      rows.push({
        symbol: INDIA_EQUITIES[idx].symbol,
        name: INDIA_EQUITIES[idx].name,
        date: r.value.date,
        isEstimate: r.value.isEstimate,
      });
    }
  });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  cache = { at: Date.now(), rows, failed };
  return { asOf: new Date(cache.at).toISOString(), rows, failed };
}
