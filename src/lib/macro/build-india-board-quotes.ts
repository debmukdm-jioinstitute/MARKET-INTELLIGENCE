import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { INDIA_BENCHMARK_DEFS } from "@/lib/feeds/india/indices";
import { fetchYahooQuoteDetailsCached } from "@/lib/feeds/sources/yahoo";
import { yahooDetailFields, type YahooQuoteFields } from "@/lib/macro/yahoo-quote-fields";

export type IndiaBoardQuoteFields = Pick<
  YahooQuoteFields,
  "volume" | "dayLow" | "dayHigh" | "week52Low" | "week52High"
>;

export type IndiaBoardQuotesPayload = {
  fetchedAt: string;
  bySymbol: Record<string, IndiaBoardQuoteFields>;
};

export function indiaBoardYahooSymbols(): string[] {
  return [
    ...INDIA_BENCHMARK_DEFS.map((d) => d.yahoo),
    ...INDIA_EQUITIES.map((i) => `${i.symbol}.NS`),
  ];
}

export function overlayIndiaBoardFields(
  yahooSymbol: string | undefined,
  bySymbol: Record<string, IndiaBoardQuoteFields>,
): IndiaBoardQuoteFields {
  if (!yahooSymbol) {
    return { volume: null, dayLow: null, dayHigh: null, week52Low: null, week52High: null };
  }
  return (
    bySymbol[yahooSymbol] ?? {
      volume: null,
      dayLow: null,
      dayHigh: null,
      week52Low: null,
      week52High: null,
    }
  );
}

function compact(fields: YahooQuoteFields): IndiaBoardQuoteFields {
  return {
    volume: fields.volume,
    dayLow: fields.dayLow,
    dayHigh: fields.dayHigh,
    week52Low: fields.week52Low,
    week52High: fields.week52High,
  };
}

export async function buildIndiaBoardQuotes(): Promise<IndiaBoardQuotesPayload> {
  const symbols = indiaBoardYahooSymbols();
  const details = await fetchYahooQuoteDetailsCached(symbols);
  const bySymbol: Record<string, IndiaBoardQuoteFields> = {};
  for (const sym of symbols) {
    const detail = details.get(sym);
    if (!detail) continue;
    bySymbol[sym] = compact(yahooDetailFields(detail));
  }
  return { fetchedAt: new Date().toISOString(), bySymbol };
}
