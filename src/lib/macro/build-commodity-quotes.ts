import type { FieldSource } from "@/lib/feeds/india/types";
import { fetchYahooQuoteDetails, yahooFinanceUrl, type YahooQuoteDetail } from "@/lib/feeds/sources/yahoo";
import {
  COMMODITY_UNIVERSE,
  formatCommodityPrice,
  type CommodityDef,
} from "@/lib/macro/commodity-universe";
import { yahooDetailFields } from "@/lib/macro/yahoo-quote-fields";

const REGION_BY_FOCUS: Record<CommodityDef["focus"], string> = {
  global: "Global",
  us: "United States",
  india: "India",
};

export type CommodityBoardQuote = {
  id: string;
  label: string;
  symbol: string;
  focus: CommodityDef["focus"];
  region: string;
  unit: string;
  decimals: number;
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  week52Low: number | null;
  week52High: number | null;
  formattedPrice: string;
  source: FieldSource;
};

function yahooSource(sym: string, asOf?: string): FieldSource {
  return { provider: "Yahoo Finance", url: yahooFinanceUrl(sym), asOf: asOf ?? new Date().toISOString() };
}

function toRow(def: CommodityDef, detail?: YahooQuoteDetail): CommodityBoardQuote {
  const { asOf, ...fields } = yahooDetailFields(detail);
  return {
    id: def.id,
    label: def.label,
    symbol: def.sym,
    focus: def.focus,
    region: REGION_BY_FOCUS[def.focus],
    unit: def.unit,
    decimals: def.decimals,
    ...fields,
    formattedPrice: formatCommodityPrice(def, fields.price),
    source: yahooSource(def.sym, asOf),
  };
}

export type CommodityQuotesPayload = {
  fetchedAt: string;
  quotes: CommodityBoardQuote[];
};

export async function buildCommodityQuotes(): Promise<CommodityQuotesPayload> {
  const details = await fetchYahooQuoteDetails(COMMODITY_UNIVERSE.map((d) => d.sym)).catch(
    () => [] as YahooQuoteDetail[],
  );
  const bySymbol = new Map(details.map((d) => [d.symbol, d]));
  return {
    fetchedAt: new Date().toISOString(),
    quotes: COMMODITY_UNIVERSE.map((def) => toRow(def, bySymbol.get(def.sym))),
  };
}
