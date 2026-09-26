import type { FieldSource } from "@/lib/feeds/india/types";
import {
  fetchYahooQuoteDetail,
  yahooFinanceUrl,
  type YahooQuoteDetail,
} from "@/lib/feeds/sources/yahoo";
import {
  INDEX_UNIVERSE,
  type IndexDef,
} from "@/lib/macro/indices-universe";

export type WorldIndexQuote = {
  id: string;
  label: string;
  symbol: string;
  copyKey: string;
  category: IndexDef["category"];
  focus: IndexDef["focus"];
  region: string;
  decimals: number;
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  week52Low: number | null;
  week52High: number | null;
  href: string;
  source: FieldSource;
};

function yahooSource(sym: string, asOf?: string): FieldSource {
  return {
    provider: "Yahoo Finance",
    url: yahooFinanceUrl(sym),
    asOf: asOf ?? new Date().toISOString(),
  };
}

function detailToRow(def: IndexDef, detail?: YahooQuoteDetail): WorldIndexQuote {
  const price = detail?.regularMarketPrice ?? null;
  const reportedPct =
    detail?.regularMarketChangePercent != null ? detail.regularMarketChangePercent / 100 : null;
  const prev =
    detail?.regularMarketPreviousClose ??
    detail?.previousClose ??
    detail?.chartPreviousClose ??
    null;
  const changePct =
    reportedPct ?? (price != null && prev != null && prev !== 0 ? (price - prev) / prev : null);
  const change =
    detail?.regularMarketChange ??
    (price != null && changePct != null ? price * changePct : price != null && prev != null ? price - prev : null);

  const asOf = detail?.regularMarketTime
    ? new Date(detail.regularMarketTime * 1000).toISOString()
    : undefined;

  return {
    id: def.id,
    label: def.label,
    symbol: def.sym,
    copyKey: def.copyKey,
    category: def.category,
    focus: def.focus,
    region: def.region,
    decimals: def.decimals,
    price,
    change,
    changePct,
    volume: detail?.regularMarketVolume ?? null,
    dayLow: detail?.regularMarketDayLow ?? null,
    dayHigh: detail?.regularMarketDayHigh ?? null,
    week52Low: detail?.fiftyTwoWeekLow ?? null,
    week52High: detail?.fiftyTwoWeekHigh ?? null,
    href: `/macro/indices#${def.id}`,
    source: yahooSource(def.sym, asOf),
  };
}

export type WorldIndicesPayload = {
  fetchedAt: string;
  indices: WorldIndexQuote[];
};

export async function buildWorldIndices(): Promise<WorldIndicesPayload> {
  const indices: WorldIndexQuote[] = [];
  const batchSize = 10;
  for (let i = 0; i < INDEX_UNIVERSE.length; i += batchSize) {
    const chunk = INDEX_UNIVERSE.slice(i, i + batchSize);
    const rows = await Promise.all(
      chunk.map(async (def) => {
        const detail = await fetchYahooQuoteDetail(def.sym);
        return detailToRow(def, detail ?? undefined);
      }),
    );
    indices.push(...rows);
  }

  return {
    fetchedAt: new Date().toISOString(),
    indices,
  };
}
