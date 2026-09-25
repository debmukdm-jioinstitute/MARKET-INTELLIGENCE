import { gunzipSync } from "node:zlib";
import { feedFetch } from "@/lib/feeds/http";

/**
 * Full NSE cash-equity universe from Upstox's public instrument master
 * (no auth needed). Filtered to plain equities and cached in memory —
 * the master only changes once a day.
 */

const NSE_MASTER_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const TTL_MS = 12 * 60 * 60 * 1000;

export type UniverseInstrument = {
  symbol: string;
  name: string;
  instrumentKey: string;
  isin: string;
};

type MasterRow = {
  segment?: string;
  instrument_type?: string;
  instrument_key?: string;
  trading_symbol?: string;
  name?: string;
  isin?: string;
};

let cache: { at: number; rows: UniverseInstrument[] } | null = null;
let inflight: Promise<UniverseInstrument[]> | null = null;

async function loadUniverse(): Promise<UniverseInstrument[]> {
  const res = await feedFetch(NSE_MASTER_URL, { timeoutMs: 30_000 });
  if (!res.ok) throw new Error(`Upstox instrument master HTTP ${res.status}`);
  const raw = gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8");
  const master = JSON.parse(raw) as MasterRow[];
  return master
    .filter((r) => r.segment === "NSE_EQ" && r.instrument_type === "EQ" && r.instrument_key && r.trading_symbol)
    .map((r) => ({
      symbol: r.trading_symbol!,
      name: r.name ?? r.trading_symbol!,
      instrumentKey: r.instrument_key!,
      isin: r.isin ?? "",
    }));
}

export async function getNseEquityUniverse(): Promise<UniverseInstrument[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  inflight ??= loadUniverse()
    .then((rows) => {
      cache = { at: Date.now(), rows };
      return rows;
    })
    .finally(() => {
      inflight = null;
    });
  try {
    return await inflight;
  } catch (e) {
    if (cache) return cache.rows; // stale universe beats none
    throw e;
  }
}
