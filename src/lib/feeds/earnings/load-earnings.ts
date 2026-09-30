import { fetchYahooEarningsDate } from "@/lib/feeds/sources/yahoo-calendar";
import { NIFTY_500 } from "@/lib/prowess/nifty500";

export type EarningsRow = { symbol: string; name: string; date: string; isEstimate: boolean };

const TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_CONCURRENCY = 18;

const EARNINGS_UNIVERSE = NIFTY_500.map(([symbol, name]) => ({ symbol, name }));

let cache: { at: number; rows: EarningsRow[]; failed: number; scanned: number } | null = null;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]!, index);
    }
  }

  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

export async function loadEarningsRows(force = false): Promise<{
  asOf: string;
  rows: EarningsRow[];
  failed: number;
  scanned: number;
}> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    return {
      asOf: new Date(cache.at).toISOString(),
      rows: cache.rows,
      failed: cache.failed,
      scanned: cache.scanned,
    };
  }

  const results = await mapWithConcurrency(EARNINGS_UNIVERSE, FETCH_CONCURRENCY, async (inst) => {
    try {
      const next = await fetchYahooEarningsDate(inst.symbol);
      if (!next) return { ok: false as const, failed: false as const };
      return {
        ok: true as const,
        row: {
          symbol: inst.symbol,
          name: inst.name,
          date: next.date,
          isEstimate: next.isEstimate,
        },
      };
    } catch {
      return { ok: false as const, failed: true as const };
    }
  });

  const rows: EarningsRow[] = [];
  let failed = 0;
  for (const r of results) {
    if ("row" in r && r.ok) rows.push(r.row);
    else if ("failed" in r && r.failed) failed += 1;
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

  cache = { at: Date.now(), rows, failed, scanned: EARNINGS_UNIVERSE.length };
  return { asOf: new Date(cache.at).toISOString(), rows, failed, scanned: cache.scanned };
}
