import type { FieldSource } from "@/lib/feeds/india/types";
import { fetchYahooQuoteDetails, yahooFinanceUrl, type YahooQuoteDetail } from "@/lib/feeds/sources/yahoo";
import {
  CURRENCY_UNIVERSE,
  formatCurrencyPrice,
  type CurrencyDef,
} from "@/lib/macro/currency-universe";
import { yahooDetailFields } from "@/lib/macro/yahoo-quote-fields";

const REGION_BY_ID: Record<string, string> = {
  usd_inr: "India",
  eur_inr: "India",
  gbp_inr: "India",
  jpy_inr: "India",
  aud_inr: "India",
  cad_inr: "India",
  chf_inr: "India",
  sgd_inr: "India",
  nzd_inr: "India",
  dxy: "United States",
  eurusd: "Eurozone",
  gbpusd: "United Kingdom",
  usdjpy: "Japan",
  usdcad: "Canada",
  usdchf: "Switzerland",
  audusd: "Australia",
  nzdusd: "New Zealand",
  usdcnh: "China",
  usdsgd: "Singapore",
  eurgbp: "Eurozone",
  eurjpy: "Japan",
  gbpjpy: "Japan",
  usdmxn: "Mexico",
  usdbrl: "Brazil",
  usdzar: "South Africa",
  usdkrw: "South Korea",
  usdtry: "Turkey",
  usdtwd: "Taiwan",
  usdidr: "Indonesia",
};

export type CurrencyBoardQuote = {
  id: string;
  label: string;
  symbol: string;
  focus: CurrencyDef["focus"];
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

function toRow(def: CurrencyDef, detail?: YahooQuoteDetail): CurrencyBoardQuote {
  const { asOf, ...fields } = yahooDetailFields(detail);
  return {
    id: def.id,
    label: def.label,
    symbol: def.sym,
    focus: def.focus,
    region: REGION_BY_ID[def.id] ?? (def.focus === "india" ? "India" : def.focus === "us" ? "United States" : "Global"),
    unit: def.unit,
    decimals: def.decimals,
    ...fields,
    formattedPrice: formatCurrencyPrice(def, fields.price),
    source: yahooSource(def.sym, asOf),
  };
}

export type CurrencyQuotesPayload = {
  fetchedAt: string;
  quotes: CurrencyBoardQuote[];
};

export async function buildCurrencyQuotes(): Promise<CurrencyQuotesPayload> {
  const details = await fetchYahooQuoteDetails(CURRENCY_UNIVERSE.map((d) => d.sym)).catch(
    () => [] as YahooQuoteDetail[],
  );
  const bySymbol = new Map(details.map((d) => [d.symbol, d]));
  return {
    fetchedAt: new Date().toISOString(),
    quotes: CURRENCY_UNIVERSE.map((def) => toRow(def, bySymbol.get(def.sym))),
  };
}
