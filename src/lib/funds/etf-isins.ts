export type TrackedEtf = {
  symbol: string;
  isin: string;
  slug: string;
  name: string;
  category: "equity" | "debt" | "commodity";
  benchmark: string;
};

export const TRACKED_ETFS: TrackedEtf[] = [
  { symbol: "NIFTYBEES", isin: "INF204KB14I2", slug: "niftybees", name: "Nippon India ETF Nifty 50 BeES", category: "equity", benchmark: "Nifty 50" },
  { symbol: "BANKBEES", isin: "INF204KB15I9", slug: "bankbees", name: "Nippon India ETF Nifty Bank BeES", category: "equity", benchmark: "Nifty Bank" },
  { symbol: "JUNIORBEES", isin: "INF732E01045", slug: "juniorbees", name: "Nippon India ETF Nifty Next 50 Junior BeES", category: "equity", benchmark: "Nifty Next 50" },
  { symbol: "MID150BEES", isin: "INF204KB1V68", slug: "mid150bees", name: "Nippon India ETF Nifty Midcap 150", category: "equity", benchmark: "Nifty Midcap 150" },
  { symbol: "ITBEES", isin: "INF204KB15V2", slug: "itbees", name: "Nippon India ETF Nifty IT", category: "equity", benchmark: "Nifty IT" },
  { symbol: "CPSEETF", isin: "INF457M01133", slug: "cpseetf", name: "CPSE ETF", category: "equity", benchmark: "Nifty CPSE" },
  { symbol: "GOLDBEES", isin: "INF204KB17I5", slug: "goldbees", name: "Nippon India ETF Gold BeES", category: "commodity", benchmark: "Domestic Gold" },
  { symbol: "SILVERBEES", isin: "INF204KC1402", slug: "silverbees", name: "Nippon India Silver ETF", category: "commodity", benchmark: "Domestic Silver" },
  { symbol: "HDFCNIFTY", isin: "INF179KC1965", slug: "hdfcnifty", name: "HDFC NIFTY 50 ETF", category: "equity", benchmark: "Nifty 50" },
  { symbol: "SETFNIF50", isin: "INF200KA1FS1", slug: "setfnif50", name: "SBI Nifty 50 ETF", category: "equity", benchmark: "Nifty 50" },
  { symbol: "LIQUIDBEES", isin: "INF732E01037", slug: "liquidbees", name: "Nippon India ETF Nifty 1D Rate Liquid BeES", category: "debt", benchmark: "Nifty 1D Rate" },
];

export const TRACKED_INDEX_FUNDS = [
  { code: "149373", isin: "INF846K01Z74", slug: "axis_nifty50", name: "Axis Nifty 50 Index Fund Direct Growth" },
  { code: "149466", isin: "INF846K01Z90", slug: "axis_next50", name: "Axis Nifty Next 50 Index Fund Direct Growth" },
  { code: "122639", isin: "INF879O01027", slug: "ppfas_flexicap", name: "Parag Parikh Flexi Cap Fund Direct Growth" },
  { code: "120716", isin: "INF209K01157", slug: "uti_nifty50", name: "UTI Nifty 50 Index Fund Direct Growth" },
  { code: "119598", isin: "INF179K01BE2", slug: "hdfc_index_nifty50", name: "HDFC Index Fund Nifty 50 Plan Direct Growth" },
];
