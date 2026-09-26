/** World equity indices — aligned with Yahoo Finance world-indices coverage. */
export type IndexCategory =
  | "americas"
  | "europe"
  | "asia_pacific"
  | "india"
  | "volatility";

export type IndexFocus = "americas" | "europe" | "asia" | "india";

export type IndexDef = {
  id: string;
  label: string;
  sym: string;
  copyKey: string;
  category: IndexCategory;
  focus: IndexFocus | "volatility";
  decimals: number;
  region: string;
};

export const INDEX_CATEGORY_LABEL: Record<IndexCategory, string> = {
  americas: "Americas",
  europe: "Europe",
  asia_pacific: "Asia-Pacific",
  india: "India",
  volatility: "Volatility",
};

export const INDEX_FOCUS_LABEL: Record<IndexFocus, string> = {
  americas: "Americas",
  europe: "Europe",
  asia: "Asia-Pacific",
  india: "India",
};

const AM = "americas" as const;
const EU = "europe" as const;
const AP = "asia" as const;
const IN = "india" as const;
const VOL = "volatility" as const;

export const INDEX_UNIVERSE: IndexDef[] = [
  // —— Americas ——
  { id: "spx", label: "S&P 500", sym: "^GSPC", copyKey: "ticker_spx", category: "americas", focus: AM, decimals: 2, region: "United States" },
  { id: "dow", label: "Dow Jones Industrial Average", sym: "^DJI", copyKey: "index_dow", category: "americas", focus: AM, decimals: 2, region: "United States" },
  { id: "nasdaq", label: "NASDAQ Composite", sym: "^IXIC", copyKey: "ticker_nasdaq", category: "americas", focus: AM, decimals: 2, region: "United States" },
  { id: "nya", label: "NYSE Composite", sym: "^NYA", copyKey: "index_nya", category: "americas", focus: AM, decimals: 2, region: "United States" },
  { id: "rut", label: "Russell 2000", sym: "^RUT", copyKey: "index_rut", category: "americas", focus: AM, decimals: 2, region: "United States" },
  { id: "tsx", label: "S&P/TSX Composite", sym: "^GSPTSE", copyKey: "index_tsx", category: "americas", focus: AM, decimals: 2, region: "Canada" },
  { id: "ibovespa", label: "IBOVESPA", sym: "^BVSP", copyKey: "index_ibovespa", category: "americas", focus: AM, decimals: 2, region: "Brazil" },
  { id: "ipc", label: "IPC Mexico", sym: "^MXX", copyKey: "index_ipc", category: "americas", focus: AM, decimals: 2, region: "Mexico" },
  { id: "ipsa", label: "S&P IPSA", sym: "^IPSA", copyKey: "index_ipsa", category: "americas", focus: AM, decimals: 2, region: "Chile" },

  // —— Europe ——
  { id: "ftse", label: "FTSE 100", sym: "^FTSE", copyKey: "ticker_ftse", category: "europe", focus: EU, decimals: 2, region: "United Kingdom" },
  { id: "dax", label: "DAX", sym: "^GDAXI", copyKey: "ticker_dax", category: "europe", focus: EU, decimals: 2, region: "Germany" },
  { id: "cac", label: "CAC 40", sym: "^FCHI", copyKey: "index_cac", category: "europe", focus: EU, decimals: 2, region: "France" },
  { id: "stoxx50", label: "EURO STOXX 50", sym: "^STOXX50E", copyKey: "index_stoxx50", category: "europe", focus: EU, decimals: 2, region: "Eurozone" },
  { id: "uk100", label: "Cboe UK 100", sym: "^BUK100P", copyKey: "index_uk100", category: "europe", focus: EU, decimals: 2, region: "United Kingdom" },

  // —— Asia-Pacific ——
  { id: "nikkei", label: "Nikkei 225", sym: "^N225", copyKey: "ticker_nikkei", category: "asia_pacific", focus: AP, decimals: 2, region: "Japan" },
  { id: "hsi", label: "Hang Seng", sym: "^HSI", copyKey: "ticker_hsi", category: "asia_pacific", focus: AP, decimals: 2, region: "Hong Kong" },
  { id: "sse", label: "SSE Composite", sym: "000001.SS", copyKey: "index_sse", category: "asia_pacific", focus: AP, decimals: 2, region: "China" },
  { id: "sti", label: "Straits Times (STI)", sym: "^STI", copyKey: "index_sti", category: "asia_pacific", focus: AP, decimals: 2, region: "Singapore" },
  { id: "asx200", label: "S&P/ASX 200", sym: "^AXJO", copyKey: "index_asx200", category: "asia_pacific", focus: AP, decimals: 2, region: "Australia" },
  { id: "kospi", label: "KOSPI", sym: "^KS11", copyKey: "index_kospi", category: "asia_pacific", focus: AP, decimals: 2, region: "South Korea" },
  { id: "twii", label: "TSEC Weighted", sym: "^TWII", copyKey: "index_twii", category: "asia_pacific", focus: AP, decimals: 2, region: "Taiwan" },
  { id: "jkse", label: "IDX Composite", sym: "^JKSE", copyKey: "index_jkse", category: "asia_pacific", focus: AP, decimals: 2, region: "Indonesia" },
  { id: "klse", label: "FTSE Bursa Malaysia KLCI", sym: "^KLSE", copyKey: "index_klse", category: "asia_pacific", focus: AP, decimals: 2, region: "Malaysia" },
  { id: "nz50", label: "S&P/NZX 50", sym: "^NZ50", copyKey: "index_nz50", category: "asia_pacific", focus: AP, decimals: 2, region: "New Zealand" },

  // —— India ——
  { id: "nifty", label: "NIFTY 50", sym: "^NSEI", copyKey: "ticker_nifty", category: "india", focus: IN, decimals: 2, region: "India" },
  { id: "sensex", label: "S&P BSE SENSEX", sym: "^BSESN", copyKey: "ticker_sensex", category: "india", focus: IN, decimals: 2, region: "India" },
  { id: "banknifty", label: "NIFTY Bank", sym: "^NSEBANK", copyKey: "ticker_banknifty", category: "india", focus: IN, decimals: 2, region: "India" },
  { id: "nifty_it", label: "NIFTY IT", sym: "^CNXIT", copyKey: "ticker_nifty_it", category: "india", focus: IN, decimals: 2, region: "India" },
  { id: "nifty_metal", label: "NIFTY Metal", sym: "^CNXMETAL", copyKey: "ticker_nifty_metal", category: "india", focus: IN, decimals: 2, region: "India" },

  // —— Volatility ——
  { id: "vix", label: "CBOE VIX", sym: "^VIX", copyKey: "ticker_vix", category: "volatility", focus: VOL, decimals: 2, region: "United States" },
  { id: "india_vix", label: "India VIX", sym: "^INDIAVIX", copyKey: "ticker_vix_in", category: "volatility", focus: VOL, decimals: 2, region: "India" },
];

export const INDEX_YAHOO_SYMBOLS = INDEX_UNIVERSE.map((i) => i.sym);

export type IndexFocusFilter = "all" | IndexFocus;

export function indexFocusCounts(): Record<IndexFocusFilter, number> {
  const americas = INDEX_UNIVERSE.filter((d) => d.focus === "americas").length;
  const europe = INDEX_UNIVERSE.filter((d) => d.focus === "europe").length;
  const asia = INDEX_UNIVERSE.filter((d) => d.focus === "asia").length;
  const india = INDEX_UNIVERSE.filter((d) => d.focus === "india").length;
  return { all: INDEX_UNIVERSE.length, americas, europe, asia, india };
}

export function parseIndexFocusParam(raw: string | null): IndexFocusFilter | null {
  if (!raw || raw === "all") return raw === "all" ? "all" : null;
  if (raw === "americas" || raw === "europe" || raw === "asia" || raw === "india") return raw;
  return null;
}

/** Macro home / ticker headline subset. */
export const INDEX_TAPE_IDS = new Set(["nifty", "sensex", "spx", "nasdaq", "dow", "vix", "nikkei", "ftse", "hsi"]);

const FOCUS_TO_CATEGORY: Record<IndexFocus, IndexCategory[]> = {
  americas: ["americas"],
  europe: ["europe"],
  asia: ["asia_pacific"],
  india: ["india"],
};

export function categoriesForFocus(focus: IndexFocusFilter): IndexCategory[] {
  if (focus === "all") return ["americas", "europe", "asia_pacific", "india", "volatility"];
  return [...FOCUS_TO_CATEGORY[focus], "volatility"];
}

export function formatIndexPrice(def: IndexDef, price: number | null): string {
  if (price == null || !Number.isFinite(price)) return "—";
  return price.toLocaleString("en-US", {
    maximumFractionDigits: def.decimals,
    minimumFractionDigits: def.decimals > 0 ? Math.min(2, def.decimals) : 0,
  });
}

export function formatIndexRange(low: number | null, high: number | null, decimals: number): string {
  if (low == null || high == null || !Number.isFinite(low) || !Number.isFinite(high)) return "—";
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
  return `${fmt(low)} – ${fmt(high)}`;
}

export function formatIndexVolume(volume: number | null): string {
  if (volume == null || !Number.isFinite(volume) || volume <= 0) return "—";
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
