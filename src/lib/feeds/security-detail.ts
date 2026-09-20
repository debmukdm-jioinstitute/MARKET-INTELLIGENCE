import { fetchAlphaVantageQuote } from "@/lib/feeds/sources/alphavantage";
import {
  fetchMassiveDailyBars,
  fetchMassiveStockSnapshots,
  hasMassiveApiKey,
  isUsEquityTicker,
  massiveTickerOverviewUrl,
} from "@/lib/feeds/sources/massive";
import { fetchStooqQuotes } from "@/lib/feeds/sources/stooq";
import {
  fetchYahooHistory,
  fetchYahooQuoteDetail,
  yahooFinanceUrl,
} from "@/lib/feeds/sources/yahoo";
import { feedFetch } from "@/lib/feeds/http";
import type { Instrument } from "@/lib/types";
import { UNIVERSE } from "@/lib/universe";

export type SourceLink = {
  id: string;
  label: string;
  url: string;
  usedFor: string;
};

export type SecurityDetailPayload = {
  symbol: string;
  instrument: Instrument | null;
  fetchedAt: string;
  quote: {
    price: number;
    change: number;
    changePct: number;
    currency: string;
    asOf: string;
    open?: number;
    dayHigh?: number;
    dayLow?: number;
    prevClose?: number;
    volume?: number;
    avgVolume?: number;
    marketCap?: number;
    pe?: number;
    forwardPe?: number;
    priceToBook?: number;
    dividendYield?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    eps?: number;
    bookValue?: number;
    exchange?: string;
    quoteType?: string;
    provider: "yahoo" | "stooq" | "alphavantage" | "simulated" | "massive";
  };
  history: { date: string; value: number }[];
  sources: SourceLink[];
  secFilingsUrl?: string;
};

let secTickerCache: Map<string, string> | null = null;

async function secFilingsUrl(symbol: string): Promise<string | undefined> {
  try {
    if (!secTickerCache) {
      const res = await feedFetch("https://www.sec.gov/files/company_tickers.json", {
        headers: {
          "User-Agent":
            process.env.FEED_USER_AGENT ??
            "MarketIntelligence research@getmarketintelligence.vercel.app",
        },
      });
      if (!res.ok) return undefined;
      const json = (await res.json()) as Record<string, { cik_str: number; ticker: string }>;
      secTickerCache = new Map();
      for (const row of Object.values(json)) {
        secTickerCache.set(row.ticker.toUpperCase(), String(row.cik_str).padStart(10, "0"));
      }
    }
    const cik = secTickerCache.get(symbol.toUpperCase());
    if (!cik) return undefined;
    return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=exclude&count=40`;
  } catch {
    return undefined;
  }
}

function stooqUrl(symbol: string) {
  return `https://stooq.com/q/?s=${symbol.toLowerCase()}.us`;
}

export async function buildSecurityDetail(symbol: string): Promise<SecurityDetailPayload> {
  const sym = symbol.toUpperCase();
  const instrument = UNIVERSE.find((u) => u.symbol === sym) ?? null;
  const sources: SourceLink[] = [];
  const fetchedAt = new Date().toISOString();

  const massiveRows = isUsEquityTicker(sym)
    ? await fetchMassiveStockSnapshots([sym], { aggFallback: true })
    : [];
  const massiveQ = massiveRows[0];
  const yahoo = await fetchYahooQuoteDetail(sym);
  let history = isUsEquityTicker(sym) ? await fetchMassiveDailyBars(sym, 400) : [];
  if (!history.length) history = await fetchYahooHistory(sym, "1y").catch(() => []);

  if (hasMassiveApiKey() && isUsEquityTicker(sym)) {
    sources.push({
      id: "massive",
      label: "Massive",
      url: massiveTickerOverviewUrl(sym),
      usedFor: "US stock snapshot & daily OHLC (when API key set)",
    });
  }
  sources.push({
    id: "yahoo",
    label: "Yahoo Finance",
    url: yahooFinanceUrl(sym),
    usedFor: "Fallback quote, fundamentals, history",
  });

  let quote: SecurityDetailPayload["quote"];

  if (massiveQ) {
    quote = {
      price: massiveQ.price,
      change: massiveQ.change,
      changePct: massiveQ.changePct,
      currency: "USD",
      asOf: massiveQ.asOf,
      provider: "massive",
    };
  } else if (yahoo?.regularMarketPrice != null) {
    quote = {
      price: yahoo.regularMarketPrice,
      change: yahoo.regularMarketChange ?? 0,
      changePct: (yahoo.regularMarketChangePercent ?? 0) / 100,
      currency: yahoo.currency ?? "USD",
      asOf: yahoo.regularMarketTime
        ? new Date(yahoo.regularMarketTime * 1000).toISOString()
        : fetchedAt,
      open: yahoo.regularMarketOpen,
      dayHigh: yahoo.regularMarketDayHigh,
      dayLow: yahoo.regularMarketDayLow,
      prevClose: yahoo.regularMarketPreviousClose,
      volume: yahoo.regularMarketVolume,
      avgVolume: yahoo.averageDailyVolume3Month,
      marketCap: yahoo.marketCap,
      pe: yahoo.trailingPE,
      forwardPe: yahoo.forwardPE,
      priceToBook: yahoo.priceToBook,
      dividendYield: yahoo.dividendYield,
      fiftyTwoWeekHigh: yahoo.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: yahoo.fiftyTwoWeekLow,
      eps: yahoo.epsTrailingTwelveMonths,
      bookValue: yahoo.bookValue,
      exchange: yahoo.exchange,
      quoteType: yahoo.quoteType,
      provider: "yahoo",
    };
  } else {
    const stooq = await fetchStooqQuotes([sym]);
    const row = stooq[0];
    if (row) {
      sources.push({
        id: "stooq",
        label: "Stooq",
        url: stooqUrl(sym),
        usedFor: "Delayed last price (fallback)",
      });
      quote = {
        price: row.price,
        change: row.change,
        changePct: row.changePct,
        currency: "USD",
        asOf: row.asOf,
        provider: "stooq",
      };
    } else {
      const av = await fetchAlphaVantageQuote(sym);
      if (av) {
        sources.push({
          id: "alphavantage",
          label: "Alpha Vantage",
          url: "https://www.alphavantage.co/",
          usedFor: "Global quote (fallback)",
        });
        quote = {
          price: av.price,
          change: av.change,
          changePct: av.changePct,
          currency: "USD",
          asOf: av.asOf,
          provider: "alphavantage",
        };
      } else {
        sources.push({
          id: "simulated",
          label: "Internal simulation",
          url: yahooFinanceUrl(sym),
          usedFor: "Model marks when live feeds unavailable",
        });
        quote = {
          price: instrument?.startPrice ?? 0,
          change: 0,
          changePct: 0,
          currency: "USD",
          asOf: fetchedAt,
          provider: "simulated",
        };
      }
    }
  }

  sources.push({
    id: "stooq-ref",
    label: "Stooq",
    url: stooqUrl(sym),
    usedFor: "Cross-check delayed quotes",
  });

  const secUrl = await secFilingsUrl(sym);
  if (secUrl) {
    sources.push({
      id: "sec",
      label: "SEC EDGAR",
      url: secUrl,
      usedFor: "US issuer filings & disclosures",
    });
  }

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    sources.push({
      id: "alphavantage-ref",
      label: "Alpha Vantage",
      url: "https://www.alphavantage.co/documentation/",
      usedFor: "Optional quote / fundamentals API",
    });
  }

  return {
    symbol: sym,
    instrument,
    fetchedAt,
    quote,
    history,
    sources,
    secFilingsUrl: secUrl,
  };
}
