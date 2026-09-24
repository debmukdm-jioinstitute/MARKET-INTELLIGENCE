import { hasDatabase } from "@/lib/db";
import { fetchRbiHomeMarket, fetchRbiLiquidity, type RbiHomeMarket, type RbiLiquidity } from "./sources/rbi-market";
import { latestPoints } from "./store";

const TTL = 30 * 60_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  try {
    const value = await fn();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return (hit?.value as T | undefined) ?? null; // keep serving last good value if RBI is down
  }
}

export const getRbiHomeMarket = (): Promise<RbiHomeMarket | null> => cached("home", fetchRbiHomeMarket);

/** Latest RBI net liquidity (₹ cr): live scrape (30-min cache), plus DB history for the 7-day change when available. */
export async function getRbiLiquidity(): Promise<(RbiLiquidity & { prev: number | null }) | null> {
  const live = await cached("liq", fetchRbiLiquidity);
  if (!live) return null;
  let prev: number | null = null;
  if (hasDatabase()) {
    const [p] = await latestPoints(["rbi_net_liquidity"]);
    prev = p?.prev ?? null;
  }
  return { ...live, prev };
}

/** RBI-published yield on the benchmark G-sec closest to 10 years remaining maturity. Null if RBI is unreachable. */
export async function getRbiBenchmark10y(): Promise<{ value: number; label: string; asOf: string } | null> {
  const home = await getRbiHomeMarket();
  if (!home?.gsecs.length) return null;
  const year = new Date().getFullYear();
  const best = home.gsecs
    .map((g) => ({ g, gap: Math.abs(Number(/(\d{4})$/.exec(g.label)?.[1]) - year - 10) }))
    .filter((x) => Number.isFinite(x.gap))
    .sort((a, b) => a.gap - b.gap)[0];
  return best ? { value: best.g.yield, label: best.g.label, asOf: home.asOf } : null;
}
