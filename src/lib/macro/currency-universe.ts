/** Yahoo Finance FX pairs on /macro/currency and macro tape. */
export type CurrencyCategory = "india_inr" | "usd_majors" | "global_cross" | "emerging_usd";

export type CurrencyFocus = "global" | "us" | "india";

export type CurrencyPriceStyle = "inr" | "fx" | "fx_jpy" | "fx_em";

export type CurrencyDef = {
  id: string;
  label: string;
  sym: string;
  copyKey: string;
  category: CurrencyCategory;
  focus: CurrencyFocus;
  decimals: number;
  unit: string;
  priceStyle: CurrencyPriceStyle;
};

export const CURRENCY_CATEGORY_LABEL: Record<CurrencyCategory, string> = {
  india_inr: "India — INR crosses",
  usd_majors: "US dollar — DXY & G10 vs USD",
  global_cross: "Global — G10 crosses (non-USD)",
  emerging_usd: "Emerging markets vs USD",
};

export const CURRENCY_FOCUS_LABEL: Record<CurrencyFocus, string> = {
  global: "Global & EM",
  us: "US dollar",
  india: "India",
};

const G = "global" as const;
const U = "us" as const;
const I = "india" as const;

export const CURRENCY_UNIVERSE: CurrencyDef[] = [
  // —— India INR ——
  { id: "usd_inr", label: "USD/INR", sym: "INR=X", copyKey: "usd_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per USD", priceStyle: "inr" },
  { id: "eur_inr", label: "EUR/INR", sym: "EURINR=X", copyKey: "eur_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per EUR", priceStyle: "inr" },
  { id: "gbp_inr", label: "GBP/INR", sym: "GBPINR=X", copyKey: "gbp_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per GBP", priceStyle: "inr" },
  { id: "jpy_inr", label: "JPY/INR", sym: "JPYINR=X", copyKey: "jpy_inr", category: "india_inr", focus: I, decimals: 4, unit: "INR per JPY", priceStyle: "inr" },
  { id: "aud_inr", label: "AUD/INR", sym: "AUDINR=X", copyKey: "aud_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per AUD", priceStyle: "inr" },
  { id: "cad_inr", label: "CAD/INR", sym: "CADINR=X", copyKey: "cad_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per CAD", priceStyle: "inr" },
  { id: "chf_inr", label: "CHF/INR", sym: "CHFINR=X", copyKey: "chf_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per CHF", priceStyle: "inr" },
  { id: "sgd_inr", label: "SGD/INR", sym: "SGDINR=X", copyKey: "sgd_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per SGD", priceStyle: "inr" },
  { id: "nzd_inr", label: "NZD/INR", sym: "NZDINR=X", copyKey: "nzd_inr", category: "india_inr", focus: I, decimals: 2, unit: "INR per NZD", priceStyle: "inr" },

  // —— US dollar bloc ——
  { id: "dxy", label: "US Dollar Index (DXY)", sym: "DX-Y.NYB", copyKey: "dxy", category: "usd_majors", focus: U, decimals: 2, unit: "Index", priceStyle: "fx" },
  { id: "eurusd", label: "EUR/USD", sym: "EURUSD=X", copyKey: "eurusd", category: "usd_majors", focus: U, decimals: 4, unit: "USD per EUR", priceStyle: "fx" },
  { id: "gbpusd", label: "GBP/USD", sym: "GBPUSD=X", copyKey: "gbpusd", category: "usd_majors", focus: U, decimals: 4, unit: "USD per GBP", priceStyle: "fx" },
  { id: "usdjpy", label: "USD/JPY", sym: "USDJPY=X", copyKey: "usdjpy", category: "usd_majors", focus: U, decimals: 3, unit: "JPY per USD", priceStyle: "fx_jpy" },
  { id: "usdcad", label: "USD/CAD", sym: "USDCAD=X", copyKey: "usdcad", category: "usd_majors", focus: U, decimals: 4, unit: "CAD per USD", priceStyle: "fx" },
  { id: "usdchf", label: "USD/CHF", sym: "USDCHF=X", copyKey: "usdchf", category: "usd_majors", focus: U, decimals: 4, unit: "CHF per USD", priceStyle: "fx" },
  { id: "audusd", label: "AUD/USD", sym: "AUDUSD=X", copyKey: "audusd", category: "usd_majors", focus: U, decimals: 4, unit: "USD per AUD", priceStyle: "fx" },
  { id: "nzdusd", label: "NZD/USD", sym: "NZDUSD=X", copyKey: "nzdusd", category: "usd_majors", focus: U, decimals: 4, unit: "USD per NZD", priceStyle: "fx" },
  { id: "usdcnh", label: "USD/CNH (offshore yuan)", sym: "USDCNH=X", copyKey: "usdcnh", category: "usd_majors", focus: U, decimals: 4, unit: "CNH per USD", priceStyle: "fx" },
  { id: "usdsgd", label: "USD/SGD", sym: "USDSGD=X", copyKey: "usdsgd", category: "usd_majors", focus: U, decimals: 4, unit: "SGD per USD", priceStyle: "fx" },

  // —— Global crosses ——
  { id: "eurgbp", label: "EUR/GBP", sym: "EURGBP=X", copyKey: "eurgbp", category: "global_cross", focus: G, decimals: 4, unit: "GBP per EUR", priceStyle: "fx" },
  { id: "eurjpy", label: "EUR/JPY", sym: "EURJPY=X", copyKey: "eurjpy", category: "global_cross", focus: G, decimals: 3, unit: "JPY per EUR", priceStyle: "fx_jpy" },
  { id: "gbpjpy", label: "GBP/JPY", sym: "GBPJPY=X", copyKey: "gbpjpy", category: "global_cross", focus: G, decimals: 3, unit: "JPY per GBP", priceStyle: "fx_jpy" },

  // —— EM vs USD ——
  { id: "usdmxn", label: "USD/MXN", sym: "USDMXN=X", copyKey: "usdmxn", category: "emerging_usd", focus: G, decimals: 4, unit: "MXN per USD", priceStyle: "fx" },
  { id: "usdbrl", label: "USD/BRL", sym: "USDBRL=X", copyKey: "usdbrl", category: "emerging_usd", focus: G, decimals: 4, unit: "BRL per USD", priceStyle: "fx" },
  { id: "usdzar", label: "USD/ZAR", sym: "USDZAR=X", copyKey: "usdzar", category: "emerging_usd", focus: G, decimals: 4, unit: "ZAR per USD", priceStyle: "fx" },
  { id: "usdkrw", label: "USD/KRW", sym: "USDKRW=X", copyKey: "usdkrw", category: "emerging_usd", focus: G, decimals: 2, unit: "KRW per USD", priceStyle: "fx_em" },
  { id: "usdtry", label: "USD/TRY", sym: "USDTRY=X", copyKey: "usdtry", category: "emerging_usd", focus: G, decimals: 4, unit: "TRY per USD", priceStyle: "fx" },
  { id: "usdtwd", label: "USD/TWD", sym: "USDTWD=X", copyKey: "usdtwd", category: "emerging_usd", focus: G, decimals: 4, unit: "TWD per USD", priceStyle: "fx" },
  { id: "usdidr", label: "USD/IDR", sym: "USDIDR=X", copyKey: "usdidr", category: "emerging_usd", focus: G, decimals: 2, unit: "IDR per USD", priceStyle: "fx_em" },
];

export const CURRENCY_YAHOO_SYMBOLS = CURRENCY_UNIVERSE.map((c) => c.sym);

export function currencyFocusCounts(): Record<"all" | CurrencyFocus, number> {
  const global = CURRENCY_UNIVERSE.filter((d) => d.focus === "global").length;
  const us = CURRENCY_UNIVERSE.filter((d) => d.focus === "us").length;
  const india = CURRENCY_UNIVERSE.filter((d) => d.focus === "india").length;
  return { all: CURRENCY_UNIVERSE.length, global, us, india };
}

export function parseCurrencyFocusParam(raw: string | null): "all" | CurrencyFocus | null {
  if (!raw || raw === "all") return raw === "all" ? "all" : null;
  if (raw === "global" || raw === "us" || raw === "india") return raw;
  return null;
}

/** Macro home strip — headline pairs (full list on /macro/currency). */
export const CURRENCY_TAPE_IDS = new Set([
  "usd_inr",
  "dxy",
  "eur_inr",
  "eurusd",
  "usdjpy",
  "usdcnh",
]);

export function formatCurrencyPrice(def: CurrencyDef, price: number | null): string {
  if (price == null || !Number.isFinite(price)) return "—";
  if (def.priceStyle === "inr") {
    return `₹${price.toLocaleString("en-IN", {
      maximumFractionDigits: def.decimals,
      minimumFractionDigits: def.decimals > 2 ? def.decimals : Math.min(def.decimals, 2),
    })}`;
  }
  if (def.priceStyle === "fx_em" && def.decimals <= 2) {
    return price.toLocaleString("en-US", { maximumFractionDigits: def.decimals, minimumFractionDigits: 0 });
  }
  return price.toFixed(def.decimals);
}
