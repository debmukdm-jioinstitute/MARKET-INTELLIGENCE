import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { searchSymbols } from "@/lib/feeds/symbol-search";
import { fetchYahooCandles } from "@/lib/feeds/sources/yahoo-candles";
import {
  isBearishRating,
  isBullishRating,
  parseRecommendation,
  type ParsedRecommendation,
  type RecoRating,
} from "@/lib/research/parse-recommendation";

export type BrokerRecoRow = {
  id: string;
  source: string;
  broker: string | null;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  scraped_at: string;
  rating: RecoRating;
  symbol: string | null;
  companyHint: string | null;
  targetPrice: number | null;
  horizon: string;
  horizonDays: number;
  basis: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  returnPct: number | null;
  hit: boolean | null;
  outcomeLabel: string | null;
};

export type BrokerAccuracyRow = {
  broker: string;
  sampleSize: number;
  scored: number;
  hitRatePct: number | null;
  avgReturnPct: number | null;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  topBasis: string | null;
  typicalHorizon: string | null;
};

type DbReport = {
  id: string;
  source: string;
  broker: string | null;
  title: string;
  url: string;
  summary: string | null;
  published_at: Date | string | null;
  scraped_at: Date | string;
};

function iso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

async function resolveSymbolFromHint(parsed: ParsedRecommendation): Promise<string | null> {
  const q = parsed.companyHint ?? "";
  if (!q || q.length < 2) return null;
  try {
    const hits = await searchSymbols(q, 4);
    const india = hits.find((h) => h.market === "IN") ?? hits[0];
    return india?.symbol ?? null;
  } catch {
    return null;
  }
}

function candleCloseOnOrAfter(candles: { ts: string; close: number }[], when: Date): number | null {
  const t = when.getTime();
  for (const c of candles) {
    if (new Date(c.ts).getTime() >= t) return c.close;
  }
  return candles[0]?.close ?? null;
}

function candleCloseOnOrBefore(candles: { ts: string; close: number }[], when: Date): number | null {
  const t = when.getTime();
  for (let i = candles.length - 1; i >= 0; i--) {
    if (new Date(candles[i]!.ts).getTime() <= t) return candles[i]!.close;
  }
  return candles[candles.length - 1]?.close ?? null;
}

function scoreOutcome(
  rating: RecoRating,
  entry: number,
  exit: number,
  target: number | null,
): { hit: boolean | null; returnPct: number; label: string } {
  const returnPct = Math.round(((exit - entry) / entry) * 10000) / 100;
  if (isBullishRating(rating)) {
    const hit = target != null ? exit >= target * 0.97 || returnPct >= 5 : returnPct >= 3;
    return {
      hit,
      returnPct,
      label: hit ? `Bullish call worked (${returnPct >= 0 ? "+" : ""}${returnPct}%)` : `Bullish call missed (${returnPct >= 0 ? "+" : ""}${returnPct}%)`,
    };
  }
  if (isBearishRating(rating)) {
    const hit = target != null ? exit <= target * 1.03 || returnPct <= -5 : returnPct <= -3;
    return {
      hit,
      returnPct,
      label: hit ? `Bearish call worked (${returnPct >= 0 ? "+" : ""}${returnPct}%)` : `Bearish call missed (${returnPct >= 0 ? "+" : ""}${returnPct}%)`,
    };
  }
  // Hold / neutral / unrated: success if stayed within ±8%
  const hit = Math.abs(returnPct) <= 8;
  return {
    hit: rating === "unrated" ? null : hit,
    returnPct,
    label:
      rating === "unrated"
        ? `Unrated move ${returnPct >= 0 ? "+" : ""}${returnPct}%`
        : hit
          ? `Hold stayed range-bound (${returnPct >= 0 ? "+" : ""}${returnPct}%)`
          : `Hold broke range (${returnPct >= 0 ? "+" : ""}${returnPct}%)`,
  };
}

async function enrichWithPrices(
  rows: Omit<BrokerRecoRow, "entryPrice" | "exitPrice" | "returnPct" | "hit" | "outcomeLabel">[],
): Promise<BrokerRecoRow[]> {
  const bySymbol = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.symbol || !r.published_at) continue;
    const list = bySymbol.get(r.symbol) ?? [];
    list.push(r);
    bySymbol.set(r.symbol, list);
  }

  const priceMap = new Map<string, { entry: number; exit: number; returnPct: number; hit: boolean | null; label: string }>();

  await Promise.all(
    [...bySymbol.entries()].slice(0, 40).map(async ([symbol, list]) => {
      try {
        const candles = await fetchYahooCandles(`${symbol}.NS`, "1Y");
        if (candles.length < 5) return;
        for (const r of list) {
          const published = new Date(r.published_at!);
          const end = new Date(published.getTime() + r.horizonDays * 24 * 60 * 60 * 1000);
          const entry = candleCloseOnOrAfter(candles, published);
          const exit = candleCloseOnOrBefore(candles, end > new Date() ? new Date() : end);
          if (entry == null || exit == null || entry <= 0) continue;
          const scored = scoreOutcome(r.rating, entry, exit, r.targetPrice);
          priceMap.set(r.id, {
            entry,
            exit,
            returnPct: scored.returnPct,
            hit: scored.hit,
            label: scored.label,
          });
        }
      } catch {
        /* fail soft per symbol */
      }
    }),
  );

  return rows.map((r) => {
    const p = priceMap.get(r.id);
    return {
      ...r,
      entryPrice: p?.entry ?? null,
      exitPrice: p?.exit ?? null,
      returnPct: p?.returnPct ?? null,
      hit: p?.hit ?? null,
      outcomeLabel: p?.label ?? null,
    };
  });
}

/** Last N broker recommendations with parsed basis/horizon and optional outcome scoring. */
export async function buildAnalystCredibility(limit = 100): Promise<{
  recommendations: BrokerRecoRow[];
  brokers: BrokerAccuracyRow[];
  dbConfigured: boolean;
}> {
  if (!hasDatabase()) {
    return { recommendations: [], brokers: [], dbConfigured: false };
  }
  await ensureSchema();
  const db = sql();
  const capped = Math.min(Math.max(limit, 1), 100);
  const reports = (await db`
    SELECT id, source, broker, title, url, summary, published_at, scraped_at
    FROM research_reports
    ORDER BY COALESCE(published_at, scraped_at) DESC
    LIMIT ${capped}
  `) as DbReport[];

  const parsedRows = await Promise.all(
    reports.map(async (r) => {
      const parsed = parseRecommendation(r.title, r.summary);
      const symbol = await resolveSymbolFromHint(parsed);
      return {
        id: r.id,
        source: r.source,
        broker: r.broker,
        title: r.title,
        url: r.url,
        summary: r.summary,
        published_at: iso(r.published_at),
        scraped_at: iso(r.scraped_at) ?? new Date().toISOString(),
        rating: parsed.rating,
        symbol,
        companyHint: parsed.companyHint,
        targetPrice: parsed.targetPrice,
        horizon: parsed.horizon ?? "implied ~3M (headline default)",
        horizonDays: parsed.horizonDays,
        basis: parsed.basis,
      };
    }),
  );

  const recommendations = await enrichWithPrices(parsedRows);
  const brokers = aggregateBrokers(recommendations);
  return { recommendations, brokers, dbConfigured: true };
}

function aggregateBrokers(rows: BrokerRecoRow[]): BrokerAccuracyRow[] {
  const map = new Map<
    string,
    {
      sampleSize: number;
      scored: number;
      hits: number;
      returns: number[];
      buyCount: number;
      sellCount: number;
      holdCount: number;
      basisCounts: Map<string, number>;
      horizonCounts: Map<string, number>;
    }
  >();

  for (const r of rows) {
    const broker = r.broker?.split(",")[0]?.trim() || "Unknown";
    const agg = map.get(broker) ?? {
      sampleSize: 0,
      scored: 0,
      hits: 0,
      returns: [] as number[],
      buyCount: 0,
      sellCount: 0,
      holdCount: 0,
      basisCounts: new Map<string, number>(),
      horizonCounts: new Map<string, number>(),
    };
    agg.sampleSize += 1;
    if (isBullishRating(r.rating)) agg.buyCount += 1;
    else if (isBearishRating(r.rating)) agg.sellCount += 1;
    else agg.holdCount += 1;
    if (r.basis) agg.basisCounts.set(r.basis, (agg.basisCounts.get(r.basis) ?? 0) + 1);
    agg.horizonCounts.set(r.horizon, (agg.horizonCounts.get(r.horizon) ?? 0) + 1);
    if (r.hit != null) {
      agg.scored += 1;
      if (r.hit) agg.hits += 1;
    }
    if (r.returnPct != null) agg.returns.push(r.returnPct);
    map.set(broker, agg);
  }

  const topKey = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return [...map.entries()]
    .map(([broker, a]) => ({
      broker,
      sampleSize: a.sampleSize,
      scored: a.scored,
      hitRatePct: a.scored ? Math.round((a.hits / a.scored) * 1000) / 10 : null,
      avgReturnPct: a.returns.length
        ? Math.round((a.returns.reduce((s, x) => s + x, 0) / a.returns.length) * 10) / 10
        : null,
      buyCount: a.buyCount,
      sellCount: a.sellCount,
      holdCount: a.holdCount,
      topBasis: topKey(a.basisCounts),
      typicalHorizon: topKey(a.horizonCounts),
    }))
    .sort((a, b) => (b.hitRatePct ?? -1) - (a.hitRatePct ?? -1) || b.sampleSize - a.sampleSize);
}
