import type { YahooQuoteDetail } from "@/lib/feeds/sources/yahoo";

export type YahooQuoteFields = {
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  week52Low: number | null;
  week52High: number | null;
  asOf?: string;
};

/** Map Yahoo v7/v8 chart meta onto board quote fields. changePct is a fraction. */
export function yahooDetailFields(detail?: YahooQuoteDetail | null): YahooQuoteFields {
  const price = detail?.regularMarketPrice ?? null;
  const reportedPct =
    detail?.regularMarketChangePercent != null ? detail.regularMarketChangePercent / 100 : null;
  const prev =
    detail?.regularMarketPreviousClose ?? detail?.previousClose ?? detail?.chartPreviousClose ?? null;
  const changePct =
    reportedPct ?? (price != null && prev != null && prev !== 0 ? (price - prev) / prev : null);
  const change =
    detail?.regularMarketChange ??
    (price != null && changePct != null
      ? price * changePct
      : price != null && prev != null
        ? price - prev
        : null);
  const asOf = detail?.regularMarketTime
    ? new Date(detail.regularMarketTime * 1000).toISOString()
    : undefined;

  return {
    price,
    change,
    changePct,
    volume: detail?.regularMarketVolume ?? null,
    dayLow: detail?.regularMarketDayLow ?? null,
    dayHigh: detail?.regularMarketDayHigh ?? null,
    week52Low: detail?.fiftyTwoWeekLow ?? null,
    week52High: detail?.fiftyTwoWeekHigh ?? null,
    asOf,
  };
}
