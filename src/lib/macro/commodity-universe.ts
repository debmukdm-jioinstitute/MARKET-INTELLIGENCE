/** Yahoo Finance instruments on /macro/commodities and macro tape. */
export type CommodityCategory =
  | "energy"
  | "precious"
  | "industrial"
  | "agriculture"
  | "us_benchmarks"
  | "india_benchmarks";

export type CommodityFocus = "global" | "us" | "india";

export type CommodityKind = "future" | "etf" | "index" | "equity";

export type PriceStyle = "usd" | "inr" | "uscents_bushel" | "uscents_lb";

export type CommodityDef = {
  id: string;
  label: string;
  sym: string;
  copyKey: string;
  category: CommodityCategory;
  focus: CommodityFocus;
  kind: CommodityKind;
  decimals: number;
  unit: string;
  priceStyle: PriceStyle;
};

export const COMMODITY_CATEGORY_LABEL: Record<CommodityCategory, string> = {
  energy: "Global energy (futures)",
  precious: "Precious metals (futures)",
  industrial: "Industrial metals (futures)",
  agriculture: "Agriculture & softs (futures)",
  us_benchmarks: "US benchmarks & commodity ETFs",
  india_benchmarks: "India — NSE proxies & sector benchmarks",
};

export const COMMODITY_FOCUS_LABEL: Record<CommodityFocus, string> = {
  global: "Global futures",
  us: "US",
  india: "India",
};

const G = "global" as const;
const U = "us" as const;
const I = "india" as const;

export const COMMODITY_UNIVERSE: CommodityDef[] = [
  // —— Global energy ——
  { id: "brent", label: "Brent crude", sym: "BZ=F", copyKey: "brent", category: "energy", focus: G, kind: "future", decimals: 2, unit: "USD/bbl", priceStyle: "usd" },
  { id: "wti", label: "WTI crude", sym: "CL=F", copyKey: "wti", category: "energy", focus: G, kind: "future", decimals: 2, unit: "USD/bbl", priceStyle: "usd" },
  { id: "natgas", label: "Natural gas (Henry Hub)", sym: "NG=F", copyKey: "natgas", category: "energy", focus: G, kind: "future", decimals: 2, unit: "USD/MMBtu", priceStyle: "usd" },
  { id: "gasoline", label: "RBOB gasoline", sym: "RB=F", copyKey: "gasoline", category: "energy", focus: G, kind: "future", decimals: 2, unit: "USD/gal", priceStyle: "usd" },
  { id: "heating_oil", label: "Heating oil", sym: "HO=F", copyKey: "heating_oil", category: "energy", focus: G, kind: "future", decimals: 2, unit: "USD/gal", priceStyle: "usd" },
  { id: "ethanol", label: "Ethanol", sym: "ETH=F", copyKey: "ethanol", category: "energy", focus: G, kind: "future", decimals: 0, unit: "USD/gal", priceStyle: "usd" },
  { id: "uranium", label: "Uranium (UxC)", sym: "UX=F", copyKey: "uranium", category: "energy", focus: G, kind: "future", decimals: 2, unit: "USD/lb U3O8", priceStyle: "usd" },

  // —— Precious ——
  { id: "gold", label: "Gold (COMEX)", sym: "GC=F", copyKey: "gold", category: "precious", focus: G, kind: "future", decimals: 0, unit: "USD/oz", priceStyle: "usd" },
  { id: "silver", label: "Silver (COMEX)", sym: "SI=F", copyKey: "silver", category: "precious", focus: G, kind: "future", decimals: 2, unit: "USD/oz", priceStyle: "usd" },
  { id: "platinum", label: "Platinum", sym: "PL=F", copyKey: "platinum", category: "precious", focus: G, kind: "future", decimals: 0, unit: "USD/oz", priceStyle: "usd" },
  { id: "palladium", label: "Palladium", sym: "PA=F", copyKey: "palladium", category: "precious", focus: G, kind: "future", decimals: 0, unit: "USD/oz", priceStyle: "usd" },

  // —— Industrial ——
  { id: "copper", label: "Copper", sym: "HG=F", copyKey: "copper", category: "industrial", focus: G, kind: "future", decimals: 2, unit: "USD/lb", priceStyle: "usd" },
  { id: "aluminum", label: "Aluminum", sym: "ALI=F", copyKey: "aluminum", category: "industrial", focus: G, kind: "future", decimals: 2, unit: "USD/lb", priceStyle: "usd" },

  // —— Agriculture ——
  { id: "corn", label: "Corn", sym: "ZC=F", copyKey: "corn", category: "agriculture", focus: G, kind: "future", decimals: 2, unit: "US¢/bu", priceStyle: "uscents_bushel" },
  { id: "soybeans", label: "Soybeans", sym: "ZS=F", copyKey: "soybeans", category: "agriculture", focus: G, kind: "future", decimals: 2, unit: "US¢/bu", priceStyle: "uscents_bushel" },
  { id: "soy_oil", label: "Soybean oil", sym: "ZL=F", copyKey: "soy_oil", category: "agriculture", focus: G, kind: "future", decimals: 2, unit: "US¢/lb", priceStyle: "uscents_lb" },
  { id: "soy_meal", label: "Soybean meal", sym: "ZM=F", copyKey: "soy_meal", category: "agriculture", focus: G, kind: "future", decimals: 1, unit: "USD/short ton", priceStyle: "usd" },
  { id: "wheat", label: "Chicago wheat", sym: "ZW=F", copyKey: "wheat", category: "agriculture", focus: G, kind: "future", decimals: 2, unit: "US¢/bu", priceStyle: "uscents_bushel" },
  { id: "kc_wheat", label: "KC wheat", sym: "KE=F", copyKey: "kc_wheat", category: "agriculture", focus: G, kind: "future", decimals: 1, unit: "US¢/bu", priceStyle: "uscents_bushel" },
  { id: "rough_rice", label: "Rough rice", sym: "ZR=F", copyKey: "rough_rice", category: "agriculture", focus: G, kind: "future", decimals: 3, unit: "USD/cwt", priceStyle: "usd" },
  { id: "sugar", label: "Sugar #11", sym: "SB=F", copyKey: "sugar", category: "agriculture", focus: G, kind: "future", decimals: 2, unit: "US¢/lb", priceStyle: "uscents_lb" },
  { id: "coffee", label: "Coffee", sym: "KC=F", copyKey: "coffee", category: "agriculture", focus: G, kind: "future", decimals: 2, unit: "US¢/lb", priceStyle: "uscents_lb" },
  { id: "cotton", label: "Cotton", sym: "CT=F", copyKey: "cotton", category: "agriculture", focus: G, kind: "future", decimals: 2, unit: "US¢/lb", priceStyle: "uscents_lb" },
  { id: "cocoa", label: "Cocoa", sym: "CC=F", copyKey: "cocoa", category: "agriculture", focus: G, kind: "future", decimals: 0, unit: "USD/ton", priceStyle: "usd" },

  // —— US ETFs & listed benchmarks ——
  { id: "us_oil_etf", label: "US Oil Fund (USO)", sym: "USO", copyKey: "us_oil_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "brent_etf", label: "Brent Oil Fund (BNO)", sym: "BNO", copyKey: "brent_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "natgas_etf", label: "Nat gas ETF (UNG)", sym: "UNG", copyKey: "natgas_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "gold_etf", label: "SPDR Gold (GLD)", sym: "GLD", copyKey: "gold_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "silver_etf", label: "iShares Silver (SLV)", sym: "SLV", copyKey: "silver_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "platinum_etf", label: "Aberdeen Platinum (PPLT)", sym: "PPLT", copyKey: "platinum_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "palladium_etf", label: "Aberdeen Palladium (PALL)", sym: "PALL", copyKey: "palladium_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "copper_etf", label: "Copper ETF (CPER)", sym: "CPER", copyKey: "copper_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "ag_etf", label: "Invesco Agriculture (DBA)", sym: "DBA", copyKey: "ag_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "corn_etf", label: "Teucrium Corn (CORN)", sym: "CORN", copyKey: "corn_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "wheat_etf", label: "Teucrium Wheat (WEAT)", sym: "WEAT", copyKey: "wheat_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "soy_etf", label: "Teucrium Soybean (SOYB)", sym: "SOYB", copyKey: "soy_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "gasoline_etf", label: "Gasoline ETF (UGA)", sym: "UGA", copyKey: "gasoline_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "xop", label: "Oil & gas E&P (XOP)", sym: "XOP", copyKey: "xop_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },
  { id: "oih", label: "Oil services (OIH)", sym: "OIH", copyKey: "oih_etf", category: "us_benchmarks", focus: U, kind: "etf", decimals: 2, unit: "USD (ETF)", priceStyle: "usd" },

  // —— India ——
  { id: "goldbees", label: "Nippon Gold BeES", sym: "GOLDBEES.NS", copyKey: "goldbees", category: "india_benchmarks", focus: I, kind: "etf", decimals: 2, unit: "INR (unit)", priceStyle: "inr" },
  { id: "silverbees", label: "Nippon Silver BeES", sym: "SILVERBEES.NS", copyKey: "silverbees", category: "india_benchmarks", focus: I, kind: "etf", decimals: 2, unit: "INR (unit)", priceStyle: "inr" },
  { id: "nifty_metal", label: "Nifty Metal index", sym: "^CNXMETAL", copyKey: "nifty_metal", category: "india_benchmarks", focus: I, kind: "index", decimals: 0, unit: "Index pts", priceStyle: "inr" },
  { id: "nifty_energy", label: "Nifty Energy index", sym: "^CNXENERGY", copyKey: "nifty_energy", category: "india_benchmarks", focus: I, kind: "index", decimals: 0, unit: "Index pts", priceStyle: "inr" },
  { id: "ongc", label: "ONGC", sym: "ONGC.NS", copyKey: "ongc_equity", category: "india_benchmarks", focus: I, kind: "equity", decimals: 2, unit: "INR/share", priceStyle: "inr" },
  { id: "coalindia", label: "Coal India", sym: "COALINDIA.NS", copyKey: "coalindia_equity", category: "india_benchmarks", focus: I, kind: "equity", decimals: 2, unit: "INR/share", priceStyle: "inr" },
  { id: "hindalco", label: "Hindalco", sym: "HINDALCO.NS", copyKey: "hindalco_equity", category: "india_benchmarks", focus: I, kind: "equity", decimals: 2, unit: "INR/share", priceStyle: "inr" },
  { id: "tatasteel", label: "Tata Steel", sym: "TATASTEEL.NS", copyKey: "tatasteel_equity", category: "india_benchmarks", focus: I, kind: "equity", decimals: 2, unit: "INR/share", priceStyle: "inr" },
];

export const COMMODITY_YAHOO_SYMBOLS = COMMODITY_UNIVERSE.map((c) => c.sym);

export function commodityFocusCounts(): Record<"all" | CommodityFocus, number> {
  const global = COMMODITY_UNIVERSE.filter((d) => d.focus === "global").length;
  const us = COMMODITY_UNIVERSE.filter((d) => d.focus === "us").length;
  const india = COMMODITY_UNIVERSE.filter((d) => d.focus === "india").length;
  return { all: COMMODITY_UNIVERSE.length, global, us, india };
}

export function parseCommodityFocusParam(raw: string | null): "all" | CommodityFocus | null {
  if (!raw || raw === "all") return raw === "all" ? "all" : null;
  if (raw === "global" || raw === "us" || raw === "india") return raw;
  return null;
}

/** Macro home strip — core global + India headline proxies (full list on /macro/commodities). */
export const COMMODITY_TAPE_IDS = new Set([
  "brent",
  "wti",
  "natgas",
  "gold",
  "silver",
  "copper",
  "goldbees",
  "nifty_metal",
  "gold_etf",
  "us_oil_etf",
]);

export function formatCommodityPrice(def: CommodityDef, price: number | null): string {
  if (price == null || !Number.isFinite(price)) return "—";
  switch (def.priceStyle) {
    case "inr":
      return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: def.decimals, minimumFractionDigits: def.decimals > 0 ? def.decimals : 0 })}`;
    case "uscents_bushel":
    case "uscents_lb":
      return `${price.toFixed(def.decimals)}¢`;
    case "usd":
    default:
      if (def.decimals === 0) {
        return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
      }
      return `$${price.toFixed(def.decimals)}`;
  }
}
