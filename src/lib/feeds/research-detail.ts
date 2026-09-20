import type { SourceLink } from "@/lib/feeds/security-detail";
import { buildSecurityDetail } from "@/lib/feeds/security-detail";
import { resolveSymbol, type SymbolSearchHit } from "@/lib/feeds/symbol-search";
import {
  fetchUpstoxFullQuotes,
  fetchUpstoxHistoricalCandles,
  fetchUpstoxKeyRatios,
  fetchUpstoxNews,
} from "@/lib/feeds/sources/upstox";
import type { Candle, FullMarketQuote } from "@/lib/feeds/sources/upstox";
import type { FundamentalsSnapshot } from "@/lib/feeds/fundamentals/types";
import type { NewsItem } from "@/lib/feeds/types";
import { UNIVERSE } from "@/lib/universe";

export type ResearchDetailPayload = {
  symbol: string;
  name: string;
  market: "IN" | "US";
  resolved: SymbolSearchHit;
  fetchedAt: string;
  upstoxQuote: FullMarketQuote | null;
  fundamentals: FundamentalsSnapshot | null;
  news: NewsItem[];
  history: { date: string; value: number }[];
  candles: Candle[];
  usDetail: Awaited<ReturnType<typeof buildSecurityDetail>> | null;
  sources: SourceLink[];
};

export async function buildResearchDetail(symbol: string): Promise<ResearchDetailPayload | null> {
  const resolved = await resolveSymbol(symbol);
  if (!resolved) return null;

  const fetchedAt = new Date().toISOString();
  const sources: SourceLink[] = [];
  let upstoxQuote: FullMarketQuote | null = null;
  let fundamentals: FundamentalsSnapshot | null = null;
  let news: NewsItem[] = [];
  let history: { date: string; value: number }[] = [];
  let candles: Candle[] = [];
  let usDetail: Awaited<ReturnType<typeof buildSecurityDetail>> | null = null;

  if (resolved.market === "IN" && resolved.instrumentKey) {
    const [quotes, newsRows] = await Promise.all([
      fetchUpstoxFullQuotes([{ instrumentKey: resolved.instrumentKey, symbol: resolved.symbol }]),
      fetchUpstoxNews([resolved.instrumentKey]).catch(() => []),
    ]);
    upstoxQuote = quotes[0] ?? null;
    news = newsRows;

    if (resolved.isin) {
      fundamentals = await fetchUpstoxKeyRatios(resolved.isin).catch(() => null);
    }

    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    candles = await fetchUpstoxHistoricalCandles(
      resolved.instrumentKey,
      "days",
      "1",
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    ).catch(() => []);
    history = candles.map((c) => ({ date: c.ts.slice(0, 10), value: c.close }));

    sources.push({
      id: "upstox-quote",
      label: "Upstox",
      url: "https://upstox.com/developer/api-documentation/get-full-market-quote/",
      usedFor: "Live quote, depth, OHLC",
    });
    if (fundamentals) {
      sources.push({
        id: "upstox-fundamentals",
        label: "Upstox",
        url: "https://upstox.com/developer/api-documentation/get-key-ratios/",
        usedFor: "Key ratios vs sector",
      });
    }
    if (news.length) {
      sources.push({
        id: "upstox-news",
        label: "Upstox",
        url: "https://upstox.com/developer/api-documentation/get-news/",
        usedFor: "Headlines",
      });
    }
  }

  if (resolved.market === "US" || !upstoxQuote) {
    usDetail = await buildSecurityDetail(resolved.symbol);
    if (!history.length) history = usDetail.history;
    sources.push(...usDetail.sources);
    if (resolved.market === "US") {
      news = [];
    }
  }

  const instrument = UNIVERSE.find((u) => u.symbol === resolved.symbol);
  const name = resolved.name || instrument?.name || resolved.symbol;

  return {
    symbol: resolved.symbol,
    name,
    market: resolved.market,
    resolved,
    fetchedAt,
    upstoxQuote,
    fundamentals,
    news,
    history,
    candles,
    usDetail,
    sources,
  };
}
