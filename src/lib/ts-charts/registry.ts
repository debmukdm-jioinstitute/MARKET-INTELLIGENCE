import type { Fmt } from "./format";
import type { Tf } from "./transform";
import type { ChartKind } from "./types";

export type ChartDef = {
  id: string;
  kind: ChartKind;
  title: string;
  dataset: string;
  /** collected_series ids; first is the primary column for indicators. */
  series: { col: string; label: string; slot?: number; tone?: "hist" }[];
  fmt: Fmt;
  digits: number;
  transform?: Tf;
  /** "p10p90" = usual band computed from full history. */
  band?: "p10p90";
  source: string;
  methodUrl?: string;
  page: string;
  /** Extra routes that show this chart. */
  also?: string[];
};

const ind = (id: string, title: string, dataset: string, col: string, fmt: Fmt, digits: number, source: string, page: string): ChartDef => ({
  id, kind: "indicator", title, dataset, series: [{ col, label: title }], fmt, digits, band: "p10p90", source, page,
});

/**
 * Chart registry. Only rows whose series ids are actually produced by a ts-ingest parser belong here;
 * extend alongside new parsers (CLAUDE_BUILD_SPEC §6.4). Unknown / empty series render "Source unavailable".
 */
const NIFTY: [string, string][] = [
  ["nifty50", "Nifty 50"], ["nifty500", "Nifty 500"], ["niftymidcap150", "Nifty Midcap 150"],
  ["niftysmallcap250", "Nifty Smallcap 250"], ["niftybank", "Nifty Bank"], ["niftyit", "Nifty IT"],
];
const tri = (slugs: string[]) => slugs.map((s) => ({ col: `ts_niftyidx_${s}_px`, label: NIFTY.find(([k]) => k === s)![1] }));
const IDX_SRC = "NSE India (price index, excludes dividends)";

export const REGISTRY: ChartDef[] = [
  // ---- valuation: P/E and P/B vs usual range, per index
  ...NIFTY.flatMap(([slug, name]): ChartDef[] => [
    { ...ind(`i.${slug}_pe`, `${name} P/E`, "nse_allindices", `ts_niftyidx_${slug}_pe`, "x", 1, "NSE India (allIndices snapshots)", "/valuation"), also: slug === "nifty50" ? ["/markets/india"] : undefined },
    ind(`i.${slug}_pb`, `${name} P/B`, "nse_allindices", `ts_niftyidx_${slug}_pb`, "x", 2, "NSE India (allIndices snapshots)", "/valuation"),
  ]),
  // ---- Indian indices
  { id: "idx.growth", kind: "line", title: "Growth of 100 (price index)", dataset: "nse_indexhistory", fmt: "num", digits: 0, transform: { type: "rebase", base: 100 }, series: tri(["nifty50", "nifty500", "niftymidcap150", "niftysmallcap250"]), source: IDX_SRC, page: "/markets/india" },
  { id: "idx.dd", kind: "line", title: "Drawdown from previous peak", dataset: "nse_indexhistory", fmt: "pct", digits: 1, transform: { type: "drawdown" }, series: tri(["nifty50", "nifty500", "niftysmallcap250"]), source: IDX_SRC, page: "/markets/india" },
  { id: "idx.roll1y", kind: "line", title: "Rolling 1-year return", dataset: "nse_indexhistory", fmt: "pct", digits: 0, transform: { type: "rolling", window: 252 }, series: tri(["nifty50", "nifty500", "niftysmallcap250"]), source: IDX_SRC, page: "/markets/india", also: ["/markets"] },
  // ---- flows, breadth, activity
  {
    id: "flows.cum_by_type", kind: "line", title: "Cumulative net cash purchases, FII vs DII", dataset: "nse_fiidii", fmt: "crore", digits: 0, transform: { type: "cumsum" },
    series: [{ col: "ts_flows_fii_net", label: "FII" }, { col: "ts_flows_dii_net", label: "DII" }], source: "NSE India (since collection began)", page: "/intelligence/institutional",
  },
  {
    id: "mk.advances_declines", kind: "line", title: "Advancing vs declining stocks", dataset: "nse_bhavcopy", fmt: "count", digits: 0,
    series: [{ col: "ts_breadth_advances", label: "Advances" }, { col: "ts_breadth_declines", label: "Declines" }], source: "NSE bhavcopy", page: "/markets/breadth", also: ["/markets"],
  },
  ind("act.cash_value", "Cash market traded value (daily)", "nse_bhavcopy", "ts_cash_traded_value", "crore", 0, "NSE bhavcopy", "/activity"),
  {
    id: "act.fno_index_fut_net", kind: "line", title: "Net index futures OI by participant", dataset: "nse_participant_oi", fmt: "int", digits: 0,
    series: [{ col: "ts_fno_fii_index_fut_net", label: "FII" }, { col: "ts_fno_dii_index_fut_net", label: "DII" }, { col: "ts_fno_pro_index_fut_net", label: "Pro" }, { col: "ts_fno_client_index_fut_net", label: "Client" }],
    source: "NSE participant OI", page: "/markets/derivatives", also: ["/activity"],
  },
  // ---- macro / global
  {
    id: "macro.policy_rates", kind: "line", title: "Central bank policy rates", dataset: "bis", fmt: "pct", digits: 2,
    series: [{ col: "ts_bis_policy_in", label: "India" }, { col: "ts_bis_policy_us", label: "US" }, { col: "ts_bis_policy_ea", label: "Euro area" }, { col: "ts_bis_policy_gb", label: "UK" }, { col: "ts_bis_policy_jp", label: "Japan" }],
    source: "BIS", page: "/macro/rbi",
  },
  ind("i.us10y", "US 10-year yield", "fred", "ts_fred_dgs10", "pct", 2, "FRED", "/macro/global"),
  ind("i.us_real10y", "US 10-year real yield", "fred", "ts_fred_dfii10", "pct", 2, "FRED", "/macro/global"),
  ind("i.dxy_broad", "Broad US dollar index", "fred", "ts_fred_dtwexbgs", "num", 1, "FRED", "/macro/currency"),
  ind("i.usdinr", "USD/INR (Fed H.10)", "fred", "ts_fred_dexinus", "rs", 2, "FRED", "/macro/currency"),
  ind("i.eur_inr", "EUR/INR (ECB reference)", "ecb", "ts_ecb_eurinr", "rs", 2, "ECB", "/macro/currency"),
  ind("i.fed_assets", "Fed balance sheet (US$ mn)", "fred", "ts_fred_walcl", "int", 0, "FRED", "/macro/global"),
  ind("i.t10y2y", "US 10-year minus 2-year yield", "fred", "ts_fred_t10y2y", "pct", 2, "FRED", "/macro/yields"),
  ind("i.fed_funds", "Fed funds effective rate", "fred", "ts_fred_dff", "pct", 2, "FRED", "/macro/global"),
  ind("i.us_unemployment", "US unemployment rate", "fred", "ts_fred_unrate", "pct", 1, "FRED", "/macro/global"),
  ind("i.brent", "Brent crude (US$/bbl, EIA via FRED)", "fred", "ts_fred_dcoilbrenteu", "num", 1, "FRED", "/macro/commodities"),
  ind("i.hy_spread", "US high-yield credit spread", "fred", "ts_fred_bamlh0a0hym2", "pct", 2, "FRED", "/macro/stress"),
  {
    id: "wb.gdp_growth", kind: "line", title: "Real GDP growth, annual", dataset: "worldbank", fmt: "pct", digits: 1,
    series: ["ind", "usa", "chn", "jpn", "deu", "gbr"].map((a) => ({ col: `ts_wb_gdp_growth_${a}`, label: a.toUpperCase() })), source: "World Bank", page: "/macro/global", also: ["/macro"],
  },
  {
    id: "wb.cpi", kind: "line", title: "CPI inflation, annual", dataset: "worldbank", fmt: "pct", digits: 1,
    series: ["ind", "usa", "chn", "jpn", "deu", "gbr"].map((a) => ({ col: `ts_wb_cpi_${a}`, label: a.toUpperCase() })), source: "World Bank", page: "/macro/global", also: ["/macro"],
  },
  ind("i.vix", "VIX", "fred", "ts_fred_vixcls", "num", 1, "FRED", "/macro/stress"),
  ind("i.nfci", "Chicago Fed financial conditions", "fred", "ts_fred_nfci", "num", 2, "FRED", "/macro/stress"),
  // ---- Mutual funds and ETFs (AMFI)
  ind("i.sip_inflow", "Monthly SIP Inflow", "amfi_sip", "ts_amfi_sip_inflow", "crore", 0, "AMFI", "/funds"),
  ind("i.sip_stoppage", "SIP Stoppage Ratio", "amfi_sip", "ts_amfi_sip_stoppage", "pct", 1, "AMFI", "/funds"),
  {
    id: "funds.aum", kind: "line", title: "Mutual fund AUM by asset class", dataset: "amfi_monthly", fmt: "crore", digits: 0,
    series: [
      { col: "ts_amfi_aum_equity", label: "Equity" },
      { col: "ts_amfi_aum_debt", label: "Debt" },
      { col: "ts_amfi_aum_hybrid", label: "Hybrid" },
      { col: "ts_amfi_aum_passive", label: "Passive / ETF" },
    ],
    source: "AMFI monthly report", page: "/funds", also: ["/funds/categories", "/funds/size"],
  },
  {
    id: "funds.flows", kind: "bars", title: "Monthly net inflows, Equity vs Debt", dataset: "amfi_monthly", fmt: "crore", digits: 0,
    series: [
      { col: "ts_amfi_net_equity", label: "Equity Net Flow" },
      { col: "ts_amfi_net_debt", label: "Debt Net Flow" },
    ],
    source: "AMFI monthly report", page: "/funds", also: ["/funds/categories"],
  },
  {
    id: "funds.nfo", kind: "bars", title: "New Fund Offerings (NFO) mobilized", dataset: "amfi_monthly", fmt: "crore", digits: 0,
    series: [{ col: "ts_amfi_nfo_mobilized", label: "NFO Collections" }],
    source: "AMFI monthly report", page: "/funds", also: ["/funds/distribution"],
  },
  {
    id: "funds.sip_trend", kind: "line", title: "Monthly SIP contributions", dataset: "amfi_sip", fmt: "crore", digits: 0,
    series: [{ col: "ts_amfi_sip_inflow", label: "SIP Inflow" }],
    source: "AMFI", page: "/funds", also: ["/funds/owners", "/funds/states"],
  },
  {
    id: "etf.niftybees", kind: "line", title: "Nifty BeES: Market price vs NAV", dataset: "nse_bhavcopy", fmt: "rs", digits: 2,
    series: [
      { col: "ts_etf_niftybees_px", label: "NSE Close" },
      { col: "ts_etf_niftybees_nav", label: "AMFI NAV" },
    ],
    source: "NSE Bhavcopy & AMFI NAV", page: "/etf", also: ["/funds/passive"],
  },
  {
    id: "etf.bankbees", kind: "line", title: "Bank BeES: Market price vs NAV", dataset: "nse_bhavcopy", fmt: "rs", digits: 2,
    series: [
      { col: "ts_etf_bankbees_px", label: "NSE Close" },
      { col: "ts_etf_bankbees_nav", label: "AMFI NAV" },
    ],
    source: "NSE Bhavcopy & AMFI NAV", page: "/etf", also: ["/funds/passive"],
  },
  {
    id: "etf.volume", kind: "bars", title: "ETF daily traded value", dataset: "nse_bhavcopy", fmt: "crore", digits: 1,
    series: [
      { col: "ts_etf_niftybees_val", label: "NIFTYBEES" },
      { col: "ts_etf_bankbees_val", label: "BANKBEES" },
      { col: "ts_etf_goldbees_val", label: "GOLDBEES" },
      { col: "ts_etf_cpseetf_val", label: "CPSEETF" },
    ],
    source: "NSE Bhavcopy", page: "/etf",
  },
  // ---- MoSPI India Macro (CPI, WPI, IIP, GDP, PLFS)
  { ...ind("i.cpi_yoy", "CPI Inflation (YoY)", "mospi", "ts_mospi_cpi_yoy", "pct", 1, "MoSPI (eSankhyiki)", "/macro/india"), also: ["/macro", "/Home"] },
  { ...ind("i.core_cpi", "Core CPI Inflation (YoY)", "mospi", "ts_mospi_core_cpi", "pct", 1, "MoSPI (Computed Non-Food Non-Fuel)", "/macro/india"), also: ["/macro"] },
  { ...ind("i.wpi", "WPI Inflation (YoY)", "mospi", "ts_mospi_wpi", "pct", 1, "MoSPI (Wholesale Price Index)", "/macro/india"), also: ["/macro"] },
  { ...ind("i.iip", "IIP Growth (YoY)", "mospi", "ts_mospi_iip", "pct", 1, "MoSPI (Index of Industrial Production)", "/macro/india"), also: ["/macro"] },
  { ...ind("i.gdp_real", "Real GDP Growth (YoY)", "mospi", "ts_mospi_gdp_real", "pct", 1, "MoSPI (National Accounts Statistics)", "/macro/india"), also: ["/macro"] },
  { ...ind("i.plfs_ur", "Urban Unemployment Rate (PLFS)", "mospi", "ts_mospi_plfs_ur", "pct", 1, "MoSPI (PLFS Quarterly Bulletin)", "/macro/india"), also: ["/macro"] },
  {
    id: "cpi.contributions", kind: "bars", title: "CPI inflation contributions by group", dataset: "mospi", fmt: "pct", digits: 2,
    series: [
      { col: "ts_mospi_cpi_food_contrib", label: "Food & Beverages" },
      { col: "ts_mospi_cpi_fuel_contrib", label: "Fuel & Light" },
      { col: "ts_mospi_cpi_housing_contrib", label: "Housing" },
      { col: "ts_mospi_cpi_clothing_contrib", label: "Clothing & Footwear" },
      { col: "ts_mospi_cpi_misc_contrib", label: "Miscellaneous" },
      { col: "ts_mospi_cpi_pan_contrib", label: "Pan & Tobacco" },
    ],
    source: "MoSPI (eSankhyiki)", page: "/macro/india", also: ["/macro"],
  },
];

/** Indicator charts addressable at /indicators/[slug] (slug = id without the "i." prefix). */
export const INDICATORS = REGISTRY.filter((c) => c.kind === "indicator" && c.id.startsWith("i."));
export const chartsForPath = (path: string) => REGISTRY.filter((c) => c.page === path || c.also?.includes(path));

export const getChartDef = (id: string) => REGISTRY.find((c) => c.id === id);
