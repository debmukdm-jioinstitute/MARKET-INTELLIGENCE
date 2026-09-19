import type { FieldSource } from "@/lib/feeds/india/types";

export type OptionGreeks = {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  pop: number;
};

export type OptionLegQuote = {
  instrumentKey: string;
  ltp: number;
  volume: number;
  oi: number;
  prevOi: number;
  closePrice: number;
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
  greeks: OptionGreeks;
};

export type OptionChainRow = {
  strike: number;
  call: OptionLegQuote | null;
  put: OptionLegQuote | null;
};

export type OptionChainSnapshot = {
  underlyingKey: string;
  underlyingName: string;
  underlyingSpot: number;
  expiry: string;
  pcr: number | null;
  totalCallOi: number | null;
  totalPutOi: number | null;
  changeOi: number | null;
  maxPain: number | null;
  topCallStrikes: { strike: number; oi: number }[];
  topPutStrikes: { strike: number; oi: number }[];
  rows: OptionChainRow[];
  source: FieldSource;
};

export type OptionUnderlying = {
  key: string;
  label: string;
  kind: "index" | "stock";
};
