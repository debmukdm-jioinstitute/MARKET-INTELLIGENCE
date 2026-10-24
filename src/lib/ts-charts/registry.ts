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
    { ...ind(`i.${slug}_pe`, `${name} P/E`, "nse_allindices", `ts_niftyidx_${slug}_pe`, "x", 1, "NSE India (allIndices snapshots)", "/markets?section=valuation"), also: slug === "nifty50" ? ["/markets?section=india"] : undefined },
    ind(`i.${slug}_pb`, `${name} P/B`, "nse_allindices", `ts_niftyidx_${slug}_pb`, "x", 2, "NSE India (allIndices snapshots)", "/markets?section=valuation"),
  ]),
  // ---- Indian indices
  { id: "idx.growth", kind: "line", title: "Growth of 100 (price index)", dataset: "nse_indexhistory", fmt: "num", digits: 0, transform: { type: "rebase", base: 100 }, series: tri(["nifty50", "nifty500", "niftymidcap150", "niftysmallcap250"]), source: IDX_SRC, page: "/markets?section=india" },
  { id: "idx.dd", kind: "line", title: "Drawdown from previous peak", dataset: "nse_indexhistory", fmt: "pct", digits: 1, transform: { type: "drawdown" }, series: tri(["nifty50", "nifty500", "niftysmallcap250"]), source: IDX_SRC, page: "/markets?section=india" },
  { id: "idx.roll1y", kind: "line", title: "Rolling 1-year return", dataset: "nse_indexhistory", fmt: "pct", digits: 0, transform: { type: "rolling", window: 252 }, series: tri(["nifty50", "nifty500", "niftysmallcap250"]), source: IDX_SRC, page: "/markets?section=india", also: ["/markets"] },
  // ---- breadth indicators (/markets/breadth & /Home)
  { ...ind("i.above200dma", "NSE stocks above 200 DMA", "nse_bhavcopy", "ts_breadth_above_200dma", "pct", 1, "NSE Bhavcopy", "/markets?section=breadth"), also: ["/Home"] },
  { ...ind("i.net_new_highs", "Net new 52-week highs", "nse_bhavcopy", "ts_breadth_net_new_highs", "num", 0, "NSE Bhavcopy", "/markets?section=breadth"), also: ["/Home"] },
  {
    id: "home.fng", kind: "indicator", title: "Market Fear & Greed Index", dataset: "sentiment", fmt: "num", digits: 0,
    series: [
      { col: "ts_breadth_advances", label: "Advances" },
      { col: "ts_breadth_declines", label: "Declines" },
      { col: "ts_derivatives_pcr", label: "PCR" },
      { col: "ts_flows_fii_net", label: "FII Flows" },
      { col: "ts_fred_vixcls", label: "VIX" },
      { col: "ts_niftyidx_nifty50_px", label: "Nifty 50" },
    ],
    source: "MarketIntelligence Model", page: "/markets?section=fear-greed", also: ["/Home"],
    band: "p10p90",
  },
  // ---- IPO Analytics (/research/ipo)
  {
    id: "ipo.day1_gain", kind: "bars", title: "IPO Day-1 listing gains distribution", dataset: "nse_ipo", fmt: "pct", digits: 1,
    series: [{ col: "ts_ipo_day1_gain", label: "Day-1 Gain (%)" }], source: "NSE India (Public Issues)", page: "/companies?section=ipo",
  },
  {
    id: "ipo.listings_per_month", kind: "bars", title: "Mainboard IPO listings per month", dataset: "nse_ipo", fmt: "num", digits: 0,
    series: [{ col: "ts_ipo_listings_count", label: "Listings" }], source: "NSE India (Public Issues)", page: "/companies?section=ipo",
  },
  {
    id: "ipo.post_listing_return", kind: "line", title: "Average post-listing performance", dataset: "nse_ipo", fmt: "pct", digits: 1,
    series: [
      { col: "ts_ipo_return_30d", label: "30-Day Return" },
      { col: "ts_ipo_return_90d", label: "90-Day Return" },
      { col: "ts_ipo_return_1y", label: "1-Year Return" },
    ],
    source: "NSE India + Bhavcopy", page: "/companies?section=ipo",
  },

  // ---- flows, breadth, activity
  {
    id: "flows.cum_by_type", kind: "line", title: "Cumulative net cash purchases, FII vs DII", dataset: "nse_fiidii", fmt: "crore", digits: 0, transform: { type: "cumsum" },
    series: [{ col: "ts_flows_fii_net", label: "FII" }, { col: "ts_flows_dii_net", label: "DII" }], source: "NSE India (since collection began)", page: "/funds?section=institutional",
  },
  {
    id: "mk.advances_declines", kind: "line", title: "Advancing vs declining stocks", dataset: "nse_bhavcopy", fmt: "count", digits: 0,
    series: [{ col: "ts_breadth_advances", label: "Advances" }, { col: "ts_breadth_declines", label: "Declines" }], source: "NSE bhavcopy", page: "/markets?section=breadth", also: ["/markets"],
  },
  ind("act.cash_value", "Cash market traded value (daily)", "nse_bhavcopy", "ts_cash_traded_value", "crore", 0, "NSE bhavcopy", "/markets?section=activity"),
  {
    id: "act.fno_index_fut_net", kind: "line", title: "Net index futures OI by participant", dataset: "nse_participant_oi", fmt: "int", digits: 0,
    series: [{ col: "ts_fno_fii_index_fut_net", label: "FII" }, { col: "ts_fno_dii_index_fut_net", label: "DII" }, { col: "ts_fno_pro_index_fut_net", label: "Pro" }, { col: "ts_fno_client_index_fut_net", label: "Client" }],
    source: "NSE participant OI", page: "/trade?section=derivatives", also: ["/markets?section=activity"],
  },
  // ---- macro / global
  {
    id: "macro.policy_rates", kind: "line", title: "Central bank policy rates", dataset: "bis", fmt: "pct", digits: 2,
    series: [{ col: "ts_bis_policy_in", label: "India" }, { col: "ts_bis_policy_us", label: "US" }, { col: "ts_bis_policy_ea", label: "Euro area" }, { col: "ts_bis_policy_gb", label: "UK" }, { col: "ts_bis_policy_jp", label: "Japan" }],
    source: "BIS", page: "/economy?section=rbi",
  },
  ind("i.us10y", "US 10-year yield", "fred", "ts_fred_dgs10", "pct", 2, "FRED", "/economy?section=global-data"),
  ind("i.us_real10y", "US 10-year real yield", "fred", "ts_fred_dfii10", "pct", 2, "FRED", "/economy?section=global-data"),
  ind("i.dxy_broad", "Broad US dollar index", "fred", "ts_fred_dtwexbgs", "num", 1, "FRED", "/markets?section=currency"),
  ind("i.usdinr", "USD/INR (Fed H.10)", "fred", "ts_fred_dexinus", "rs", 2, "FRED", "/markets?section=currency"),
  ind("i.eur_inr", "EUR/INR (ECB reference)", "ecb", "ts_ecb_eurinr", "rs", 2, "ECB", "/markets?section=currency"),
  ind("i.fed_assets", "Fed balance sheet (US$ mn)", "fred", "ts_fred_walcl", "int", 0, "FRED", "/economy?section=global-data"),
  ind("i.t10y2y", "US 10-year minus 2-year yield", "fred", "ts_fred_t10y2y", "pct", 2, "FRED", "/economy?section=yields"),
  ind("i.fed_funds", "Fed funds effective rate", "fred", "ts_fred_dff", "pct", 2, "FRED", "/economy?section=global-data"),
  ind("i.us_unemployment", "US unemployment rate", "fred", "ts_fred_unrate", "pct", 1, "FRED", "/economy?section=global-data"),
  ind("i.brent", "Brent crude (US$/bbl, EIA via FRED)", "fred", "ts_fred_dcoilbrenteu", "num", 1, "FRED", "/markets?section=commodities"),
  ind("i.hy_spread", "US high-yield credit spread", "fred", "ts_fred_bamlh0a0hym2", "pct", 2, "FRED", "/economy?section=macro-stress"),
  {
    id: "wb.gdp_growth", kind: "line", title: "Real GDP growth, annual", dataset: "worldbank", fmt: "pct", digits: 1,
    series: ["ind", "usa", "chn", "jpn", "deu", "gbr"].map((a) => ({ col: `ts_wb_gdp_growth_${a}`, label: a.toUpperCase() })), source: "World Bank", page: "/economy?section=global-data", also: ["/economy"],
  },
  {
    id: "wb.cpi", kind: "line", title: "CPI inflation, annual", dataset: "worldbank", fmt: "pct", digits: 1,
    series: ["ind", "usa", "chn", "jpn", "deu", "gbr"].map((a) => ({ col: `ts_wb_cpi_${a}`, label: a.toUpperCase() })), source: "World Bank", page: "/economy?section=global-data", also: ["/economy"],
  },
  ind("i.vix", "VIX", "fred", "ts_fred_vixcls", "num", 1, "FRED", "/economy?section=macro-stress"),
  ind("i.nfci", "Chicago Fed financial conditions", "fred", "ts_fred_nfci", "num", 2, "FRED", "/economy?section=macro-stress"),
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
    source: "AMFI monthly report", page: "/funds", also: ["/funds?section=categories", "/funds?section=scheme-size"],
  },
  {
    id: "funds.flows", kind: "bars", title: "Monthly net inflows, Equity vs Debt", dataset: "amfi_monthly", fmt: "crore", digits: 0,
    series: [
      { col: "ts_amfi_net_equity", label: "Equity Net Flow" },
      { col: "ts_amfi_net_debt", label: "Debt Net Flow" },
    ],
    source: "AMFI monthly report", page: "/funds", also: ["/funds?section=categories"],
  },
  {
    id: "funds.nfo", kind: "bars", title: "New Fund Offerings (NFO) mobilized", dataset: "amfi_monthly", fmt: "crore", digits: 0,
    series: [{ col: "ts_amfi_nfo_mobilized", label: "NFO Collections" }],
    source: "AMFI monthly report", page: "/funds", also: ["/funds?section=nfo-distribution"],
  },
  {
    id: "funds.sip_trend", kind: "line", title: "Monthly SIP contributions", dataset: "amfi_sip", fmt: "crore", digits: 0,
    series: [{ col: "ts_amfi_sip_inflow", label: "SIP Inflow" }],
    source: "AMFI", page: "/funds", also: ["/funds?section=sip", "/funds?section=geo-aum"],
  },
  {
    id: "etf.niftybees", kind: "line", title: "Nifty BeES: Market price vs NAV", dataset: "nse_bhavcopy", fmt: "rs", digits: 2,
    series: [
      { col: "ts_etf_niftybees_px", label: "NSE Close" },
      { col: "ts_etf_niftybees_nav", label: "AMFI NAV" },
    ],
    source: "NSE Bhavcopy & AMFI NAV", page: "/funds?section=etf", also: ["/funds?section=passive"],
  },
  {
    id: "etf.bankbees", kind: "line", title: "Bank BeES: Market price vs NAV", dataset: "nse_bhavcopy", fmt: "rs", digits: 2,
    series: [
      { col: "ts_etf_bankbees_px", label: "NSE Close" },
      { col: "ts_etf_bankbees_nav", label: "AMFI NAV" },
    ],
    source: "NSE Bhavcopy & AMFI NAV", page: "/funds?section=etf", also: ["/funds?section=passive"],
  },
  {
    id: "etf.volume", kind: "bars", title: "ETF daily traded value", dataset: "nse_bhavcopy", fmt: "crore", digits: 1,
    series: [
      { col: "ts_etf_niftybees_val", label: "NIFTYBEES" },
      { col: "ts_etf_bankbees_val", label: "BANKBEES" },
      { col: "ts_etf_goldbees_val", label: "GOLDBEES" },
      { col: "ts_etf_cpseetf_val", label: "CPSEETF" },
    ],
    source: "NSE Bhavcopy", page: "/funds?section=etf",
  },
  // ---- MoSPI India Macro (CPI, WPI, IIP, GDP, PLFS)
  { ...ind("i.cpi_yoy", "CPI Inflation (YoY)", "mospi", "ts_mospi_cpi_yoy", "pct", 1, "MoSPI (eSankhyiki)", "/economy?section=india-macro"), also: ["/economy", "/Home"] },
  { ...ind("i.core_cpi", "Core CPI Inflation (YoY)", "mospi", "ts_mospi_core_cpi", "pct", 1, "MoSPI (Computed Non-Food Non-Fuel)", "/economy?section=india-macro"), also: ["/economy"] },
  { ...ind("i.wpi", "WPI Inflation (YoY)", "mospi", "ts_mospi_wpi", "pct", 1, "MoSPI (Wholesale Price Index)", "/economy?section=india-macro"), also: ["/economy"] },
  { ...ind("i.iip", "IIP Growth (YoY)", "mospi", "ts_mospi_iip", "pct", 1, "MoSPI (Index of Industrial Production)", "/economy?section=india-macro"), also: ["/economy"] },
  { ...ind("i.gdp_real", "Real GDP Growth (YoY)", "mospi", "ts_mospi_gdp_real", "pct", 1, "MoSPI (National Accounts Statistics)", "/economy?section=india-macro"), also: ["/economy"] },
  { ...ind("i.plfs_ur", "Urban Unemployment Rate (PLFS)", "mospi", "ts_mospi_plfs_ur", "pct", 1, "MoSPI (PLFS Quarterly Bulletin)", "/economy?section=india-macro"), also: ["/economy"] },
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
    source: "MoSPI (eSankhyiki)", page: "/economy?section=india-macro", also: ["/economy"],
  },
  // ---- RBI & Credit Intelligence (/macro/rbi & /intelligence/credit)
  { ...ind("i.rbi_repo", "RBI Policy Repo Rate", "rbi_wss", "ts_rbi_repo", "pct", 2, "Reserve Bank of India", "/economy?section=rbi"), also: ["/economy"] },
  ind("i.rbi_crr", "Cash Reserve Ratio (CRR)", "rbi_wss", "ts_rbi_crr", "pct", 2, "Reserve Bank of India", "/economy?section=rbi"),
  ind("i.rbi_slr", "Statutory Liquidity Ratio (SLR)", "rbi_wss", "ts_rbi_slr", "pct", 2, "Reserve Bank of India", "/economy?section=rbi"),
  { ...ind("i.rbi_laf_net", "Net System Liquidity (LAF)", "rbi_wss", "ts_rbi_laf_net", "crore", 0, "Reserve Bank of India (MMO)", "/economy?section=rbi"), also: ["/economy"] },
  ind("i.rbi_call_spread", "Call Money vs Repo Spread", "rbi_wss", "ts_rbi_call_spread", "pct", 2, "Reserve Bank of India (MMO)", "/economy?section=rbi"),
  { ...ind("i.rbi_real_repo", "Real Repo Rate (vs CPI)", "rbi_wss", "ts_rbi_real_repo", "pct", 2, "Reserve Bank of India", "/economy?section=rbi"), also: ["/economy"] },
  ind("i.rbi_mpc_votes", "MPC Majority Votes", "rbi_dbie", "ts_rbi_mpc_votes", "num", 0, "Reserve Bank of India (MPC)", "/economy?section=rbi"),
  {
    id: "rbi.corridor", kind: "line", title: "RBI policy rate corridor and call rate", dataset: "rbi_wss", fmt: "pct", digits: 2,
    series: [
      { col: "ts_rbi_msf", label: "MSF (ceiling)" },
      { col: "ts_rbi_repo", label: "Policy Repo" },
      { col: "ts_rbi_sdf", label: "SDF (floor)" },
      { col: "ts_rbi_call_rate", label: "Call Money (WAvg)" },
    ],
    source: "Reserve Bank of India (MMO)", page: "/economy?section=rbi", also: ["/economy"],
  },
  { ...ind("i.credit_growth", "Bank Credit Growth (YoY)", "rbi_dbie", "ts_rbi_credit_growth", "pct", 1, "Reserve Bank of India (Sectoral Deployment)", "/companies?section=credit"), also: ["/economy?section=india-macro"] },
  ind("i.deposit_growth", "Term Deposit Rate (WADTDR)", "rbi_dbie", "ts_rbi_deposit_growth", "pct", 2, "Reserve Bank of India", "/companies?section=credit"),
  ind("i.walr_outstanding", "WALR on Outstanding Loans", "rbi_dbie", "ts_rbi_walr_outstanding", "pct", 2, "Reserve Bank of India", "/companies?section=credit"),
  ind("i.walr_fresh", "WALR on Fresh Loans", "rbi_dbie", "ts_rbi_walr_fresh", "pct", 2, "Reserve Bank of India", "/companies?section=credit"),
  {
    id: "credit.sectoral", kind: "bars", title: "Sectoral credit growth (YoY)", dataset: "rbi_dbie", fmt: "pct", digits: 1,
    series: [
      { col: "ts_rbi_credit_services", label: "Services" },
      { col: "ts_rbi_credit_industry", label: "Industry" },
      { col: "ts_rbi_credit_agri", label: "Agriculture" },
      { col: "ts_rbi_credit_personal", label: "Personal Loans" },
    ],
    source: "Reserve Bank of India (Sectoral Deployment)", page: "/companies?section=credit",
  },
  // ---- Flows and Ownership (/intelligence/institutional & /intelligence/promoters)
  { ...ind("i.fpi_net_eq", "FPI Monthly Net Equity Flow", "nsdl_fpi", "ts_nsdl_fpi_net_equity_m", "crore", 0, "NSDL FPI", "/funds?section=institutional"), also: ["/Home", "/economy"] },
  ind("i.fpi_net_debt", "FPI Monthly Net Debt Flow", "nsdl_fpi", "ts_nsdl_fpi_net_debt_m", "crore", 0, "NSDL FPI", "/funds?section=institutional"),
  {
    id: "fpi.flows_monthly", kind: "bars", title: "FPI monthly net flows into equity and debt", dataset: "nsdl_fpi", fmt: "crore", digits: 0,
    series: [
      { col: "ts_nsdl_fpi_net_equity_m", label: "Equity" },
      { col: "ts_nsdl_fpi_net_debt_m", label: "Debt" },
    ],
    source: "NSDL FPI", page: "/funds?section=institutional",
  },
  {
    id: "fpi.sector_auc", kind: "bars", title: "FPI sector equity assets under custody (AUC)", dataset: "nsdl_fpi", fmt: "crore", digits: 0,
    series: [
      { col: "ts_nsdl_fpi_sector_fin", label: "Financial Services" },
      { col: "ts_nsdl_fpi_sector_it", label: "Information Technology" },
      { col: "ts_nsdl_fpi_sector_pharma", label: "Healthcare" },
      { col: "ts_nsdl_fpi_sector_auto", label: "Automobile" },
      { col: "ts_nsdl_fpi_sector_capgoods", label: "Capital Goods" },
      { col: "ts_nsdl_fpi_sector_oil", label: "Oil & Gas" },
      { col: "ts_nsdl_fpi_sector_fmcg", label: "FMCG" },
      { col: "ts_nsdl_fpi_sector_power", label: "Power" },
    ],
    source: "NSDL FPI (Fortnightly)", page: "/funds?section=institutional",
  },
  ind("i.nsdl_active_accounts", "NSDL Active Demat Accounts", "nsdl_depo", "ts_nsdl_client_accounts", "num", 0, "National Securities Depository Limited", "/funds?section=institutional"),
  ind("i.cdsl_active_accounts", "CDSL Active Demat Accounts", "cdsl_bo", "ts_cdsl_bo_accounts", "num", 0, "Central Depository Services Limited", "/funds?section=institutional"),
  { ...ind("i.demat_total", "Total Demat Accounts (CDSL + NSDL)", "cdsl_bo", "ts_depo_total_accounts", "num", 0, "CDSL & NSDL", "/funds?section=institutional"), also: ["/Home"] },
  {
    id: "flows.cumulative", kind: "line", title: "Cumulative net market flows by investor type", dataset: "nse_fiidii", fmt: "crore", digits: 0,
    transform: { type: "cumsum" },
    series: [
      { col: "ts_flows_fii_net", label: "FII / FPI Net" },
      { col: "ts_flows_dii_net", label: "DII Net" },
    ],
    source: "NSE India (FII/DII Trading Data)", page: "/funds?section=institutional",
  },
  {
    id: "ownership.market_share", kind: "share", title: "Equity ownership share by investor class", dataset: "shareholding", fmt: "pct", digits: 1,
    series: [
      { col: "ts_ownership_promoter", label: "Promoter & Group" },
      { col: "ts_ownership_fii", label: "Foreign Portfolio (FPI)" },
      { col: "ts_ownership_dii", label: "Domestic Institutions (DII)" },
      { col: "ts_ownership_mf", label: "Mutual Funds" },
      { col: "ts_ownership_retail", label: "Retail & Public" },
    ],
    source: "NSE Shareholding Filings (XBRL)", page: "/funds?section=institutional", also: ["/companies?section=promoters"],
  },
  // ---- Derivatives & F&O (/markets/derivatives)
  { ...ind("i.pcr", "Total Derivatives Put-Call Ratio (PCR)", "nse_participant_oi", "ts_derivatives_pcr", "num", 2, "NSE India", "/trade?section=derivatives"), also: ["/Home"] },
  ind("i.pcr_index", "Index Options Put-Call Ratio (PCR)", "nse_participant_oi", "ts_derivatives_pcr_index", "num", 2, "NSE India", "/trade?section=derivatives"),
  ind("i.retail_fno_share", "Retail Share of F&O Open Interest", "nse_participant_oi", "ts_fno_share_client", "pct", 1, "NSE India", "/trade?section=derivatives"),
  {
    id: "fno.who_trades", kind: "share", title: "Equity derivatives open interest by participant category", dataset: "nse_participant_oi", fmt: "pct", digits: 1,
    series: [
      { col: "ts_fno_share_client", label: "Retail (Client)" },
      { col: "ts_fno_share_fii", label: "Foreign Portfolio (FII)" },
      { col: "ts_fno_share_pro", label: "Proprietary Desks (Pro)" },
      { col: "ts_fno_share_dii", label: "Domestic Institutions (DII)" },
    ],
    source: "NSE India (Participant OI)", page: "/trade?section=derivatives",
  },
  // ---- Rates, Sovereign Yields & Curves (/macro/yields)
  { ...ind("i.in10y", "India 10-year sovereign G-Sec yield", "nse_wdm", "ts_gsec_10y", "pct", 2, "NSE WDM", "/economy?section=yields"), also: ["/economy", "/Home"] },
  ind("i.gsec_spread_10y_1y", "India 10Y minus 1Y sovereign spread", "nse_wdm", "ts_gsec_spread_10y_1y", "pct", 2, "NSE WDM", "/economy?section=yields"),
  {
    id: "yields.gsec_curve", kind: "curve", title: "Traded sovereign G-Sec yield curve", dataset: "nse_wdm", fmt: "pct", digits: 2,
    series: [
      { col: "ts_gsec_1y", label: "1Y" },
      { col: "ts_gsec_3y", label: "3Y" },
      { col: "ts_gsec_5y", label: "5Y" },
      { col: "ts_gsec_7y", label: "7Y" },
      { col: "ts_gsec_10y", label: "10Y" },
      { col: "ts_gsec_14y", label: "14Y" },
      { col: "ts_gsec_30y", label: "30Y" },
    ],
    source: "NSE WDM Traded G-Secs", page: "/economy?section=yields",
  },
  {
    id: "yields.gsec_history", kind: "line", title: "Sovereign G-Sec yields history across key tenors", dataset: "nse_wdm", fmt: "pct", digits: 2,
    series: [
      { col: "ts_gsec_1y", label: "1Y G-Sec" },
      { col: "ts_gsec_5y", label: "5Y G-Sec" },
      { col: "ts_gsec_10y", label: "10Y G-Sec" },
      { col: "ts_gsec_30y", label: "30Y G-Sec" },
    ],
    source: "NSE WDM Traded G-Secs", page: "/economy?section=yields",
  },

  // ---- Margin Trading Facility (MTF) & Leverage (/leverage & /leverage/mtf)
  { ...ind("i.mtf_book", "MTF Funded Margin Book", "nse_mtf", "ts_mtf_book", "crore", 0, "NSE India (MTF)", "/funds?section=mtf"), also: ["/funds?section=mtf"] },
  { ...ind("i.mtf_fresh_exposure", "MTF Daily Fresh Exposure", "nse_mtf", "ts_mtf_fresh_exposure", "crore", 0, "NSE India (MTF)", "/funds?section=mtf"), also: ["/funds?section=mtf"] },
  { ...ind("i.mtf_liquidated", "MTF Daily Liquidated Exposure", "nse_mtf", "ts_mtf_liquidated", "crore", 0, "NSE India (MTF)", "/funds?section=mtf"), also: ["/funds?section=mtf"] },
  {
    id: "mtf.book_and_flows", kind: "bars", title: "MTF daily fresh exposure and liquidations", dataset: "nse_mtf", fmt: "crore", digits: 0,
    series: [
      { col: "ts_mtf_fresh_exposure", label: "Fresh Exposure" },
      { col: "ts_mtf_liquidated", label: "Liquidated" },
    ],
    source: "NSE India (SEBI Margin Trading Report)", page: "/funds?section=mtf", also: ["/funds?section=mtf"],
  },
];

/** Indicator charts addressable at /indicators/[slug] (slug = id without the "i." prefix). */
export const INDICATORS = REGISTRY.filter((c) => c.kind === "indicator" && c.id.startsWith("i."));
export const chartsForPath = (path: string) => REGISTRY.filter((c) => c.page === path || c.also?.includes(path));

export const getChartDef = (id: string) => REGISTRY.find((c) => c.id === id);
