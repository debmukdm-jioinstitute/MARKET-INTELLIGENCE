import { fetchNseBreadth } from "@/lib/feeds/india/nse-market";
import type { BreadthSnapshot } from "@/lib/feeds/india/types";
import { getNseEquityUniverse } from "@/lib/feeds/india/universe";
import { getWeek52Levels } from "@/lib/feeds/india/week52-levels";
import { fetchUpstoxFullQuotes } from "@/lib/feeds/sources/upstox";

const UPSTOX_SOURCE = {
  provider: "Upstox (NSE cash)",
  url: "https://upstox.com/developer/api-documentation/ltp-v3/",
};
const CHUNK = 100; // full quote accepts up to 500 keys; keep URLs and payloads modest
const CONCURRENCY = 5;
const TTL_MS = 10_000;
/** Share of the universe that must have stored 52W levels before Upstox 52W counts replace NSE's. */
const MIN_LEVEL_COVERAGE = 0.7;
/** Below this many priced scrips the universe scan is not trustworthy (token expired, outage). */
const MIN_COVERAGE = 500;

let cache: { at: number; snap: BreadthSnapshot } | null = null;
let inflight: Promise<BreadthSnapshot> | null = null;

async function computeUpstoxBreadth() {
  const [universe, levels] = await Promise.all([getNseEquityUniverse(), getWeek52Levels()]);
  const chunks: typeof universe[] = [];
  for (let i = 0; i < universe.length; i += CHUNK) chunks.push(universe.slice(i, i + CHUNK));

  let advances = 0;
  let declines = 0;
  let unchanged = 0;
  let high52w = 0;
  let low52w = 0;
  let withLevels = 0;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const results = await Promise.all(
      chunks.slice(i, i + CONCURRENCY).map((c) =>
        fetchUpstoxFullQuotes(c.map((u) => ({ instrumentKey: u.instrumentKey, symbol: u.symbol }))).catch(() => []),
      ),
    );
    for (const quotes of results) {
      for (const q of quotes) {
        if (q.netChange > 0) advances++;
        else if (q.netChange < 0) declines++;
        else unchanged++;
        // New 52W high/low = today's range touched/crossed the prior 52W extreme (intraday, like NSE).
        const lv = levels.get(q.symbol);
        if (lv && q.ohlc.high > 0) {
          withLevels++;
          if (q.ohlc.high >= lv.high52) high52w++;
          if (q.ohlc.low > 0 && q.ohlc.low <= lv.low52) low52w++;
        }
      }
    }
  }
  const total = advances + declines + unchanged;
  const levelsOk = total > 0 && withLevels / total >= MIN_LEVEL_COVERAGE;
  return { advances, declines, unchanged, total, high52w: levelsOk ? high52w : null, low52w: levelsOk ? low52w : null };
}

async function build(): Promise<BreadthSnapshot> {
  // 52W counts come from stored candle-derived levels; NSE fills in when those are missing, and is the adv/dec fallback.
  const [upstox, nse] = await Promise.all([
    computeUpstoxBreadth().catch(() => null),
    fetchNseBreadth().catch(() => null),
  ]);
  if (upstox && upstox.total >= MIN_COVERAGE) {
    return {
      advances: upstox.advances,
      declines: upstox.declines,
      unchanged: upstox.unchanged,
      high52w: upstox.high52w ?? nse?.high52w ?? null,
      low52w: upstox.low52w ?? nse?.low52w ?? null,
      source: UPSTOX_SOURCE,
    };
  }
  return (
    nse ?? {
      advances: null,
      declines: null,
      unchanged: null,
      high52w: null,
      low52w: null,
      source: UPSTOX_SOURCE,
    }
  );
}

export async function fetchLiveBreadth(): Promise<BreadthSnapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.snap;
  inflight ??= build()
    .then((snap) => {
      cache = { at: Date.now(), snap };
      return snap;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
