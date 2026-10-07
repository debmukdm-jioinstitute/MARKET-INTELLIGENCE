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
import {
  buildResearchIntelligence,
  type ResearchIntelligence,
} from "@/lib/feeds/research-intelligence";
import { UNIVERSE } from "@/lib/universe";
import { fetchCompanyAbout, type CompanyAbout } from "@/lib/feeds/company-about";

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
  intelligence: ResearchIntelligence;
  about: CompanyAbout | null;
  sources: SourceLink[];
};

export async function buildResearchDetail(symbol: string): Promise<ResearchDetailPayload | null> {
  const resolved = await resolveSymbol(symbol);
  if (!resolved) return null;

  const fetchedAt = new Date().toISOString();
  const sources: SourceLink[] = [];
  const isIndiaUpstox = resolved.market === "IN" && Boolean(resolved.instrumentKey);
  const instrumentKey = resolved.instrumentKey ?? "";

  const instrument = UNIVERSE.find((u) => u.symbol === resolved.symbol);
  const name = resolved.name || instrument?.name || resolved.symbol;

  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 5);

  // Everything below depends only on `resolved`, so it all starts at once
  // (previously 5 sequential network stages).
  const quoteP: Promise<FullMarketQuote | null> = isIndiaUpstox
    ? fetchUpstoxFullQuotes([{ instrumentKey, symbol: resolved.symbol }])
        .then((rows) => rows[0] ?? null)
        .catch(() => null)
    : Promise.resolve(null);
  const upstoxNewsP: Promise<NewsItem[]> = isIndiaUpstox
    ? fetchUpstoxNews([instrumentKey]).catch(() => [] as NewsItem[])
    : Promise.resolve([] as NewsItem[]);
  const fundamentalsP: Promise<FundamentalsSnapshot | null> =
    isIndiaUpstox && resolved.isin
      ? fetchUpstoxKeyRatios(resolved.isin).catch(() => null)
      : Promise.resolve(null);
  const candlesP: Promise<Candle[]> = isIndiaUpstox
    ? fetchUpstoxHistoricalCandles(
        instrumentKey,
        "days",
        "1",
        from.toISOString().slice(0, 10),
        to.toISOString().slice(0, 10),
      ).catch(() => [] as Candle[])
    : Promise.resolve([] as Candle[]);
  // US names, or India names whose Upstox quote failed, use the security-detail waterfall.
  const usDetailP = quoteP.then((q) =>
    resolved.market === "US" || !q ? buildSecurityDetail(resolved.symbol) : null,
  );
  // Intelligence only needs the Upstox headlines, so it chains on that one call.
  const intelligenceP = upstoxNewsP.then((upstoxNews) =>
    buildResearchIntelligence({
      symbol: resolved.symbol,
      name,
      market: resolved.market,
      isin: resolved.isin,
      upstoxNews: resolved.market === "US" ? [] : upstoxNews,
    }),
  );
  const aboutP = fetchCompanyAbout(name, { isin: resolved.isin, symbol: resolved.symbol, market: resolved.market });

  const [upstoxQuote, upstoxNews, fundamentals, candles, usDetail, intelligence, about] = await Promise.all([
    quoteP,
    upstoxNewsP,
    fundamentalsP,
    candlesP,
    usDetailP,
    intelligenceP,
    aboutP,
  ]);

  let news: NewsItem[] = upstoxNews;
  let history: { date: string; value: number }[] = candles.map((c) => ({ date: c.ts.slice(0, 10), value: c.close }));

  if (isIndiaUpstox) {
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

  if (usDetail) {
    if (!history.length) history = usDetail.history;
    sources.push(...usDetail.sources);
    if (resolved.market === "US") {
      news = [];
    }
  }

  if (about) {
    sources.push({ id: "wikipedia-about", label: about.source, url: about.url, usedFor: "Company overview" });
  }
  if (intelligence.newsFeed.length) {
    sources.push({
      id: "google-news-rss",
      label: "Google News",
      url: "https://news.google.com/",
      usedFor: "Symbol-specific headlines (RSS)",
    });
  }
  if (intelligence.corporateActions.some((c) => c.source === "nse")) {
    sources.push({
      id: "nse-corporate-actions",
      label: "NSE India",
      url: "https://www.nseindia.com/companies-listing/corporate-filings-actions",
      usedFor: "Corporate actions calendar",
    });
  }

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
    intelligence,
    about,
    sources,
  };
}
