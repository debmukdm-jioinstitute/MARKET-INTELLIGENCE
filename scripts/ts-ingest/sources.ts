import { addDays, fmtDmy, fmtYmd } from "./dates";
import type { EventParserName, ParserName } from "./parsers";

export type Req = { /** Tried when the primary request returns an HTML page. */ alt?: Req; url: string; method?: "GET" | "POST"; body?: string; headers?: Record<string, string>; meta?: Record<string, string> };
export type ReqCtx = { date?: string; latest: string | null; today: string; since?: string };

export type SourceCfg = {
  id: string;
  /** Preferred over `urls` when set: full request specs (POST bodies, per-index metadata). */
  reqs?: (c: ReqCtx) => Req[];
  /** One request per candidate date (daily-by-date archives) or a single url for snapshot APIs. */
  urls: (d?: string) => string[];
  perDate: boolean;
  fmt: "csv" | "zip-csv" | "json" | "text" | "binary" | "html";
  freq: "daily" | "weekly" | "monthly";
  /** Dataset staleness tolerance in days before state flips current → behind. */
  lagDays: number;
  nseCookie?: boolean;
  /** Page to GET first for session cookies (ASP.NET sites). */
  warm?: string;
  /** Send a full browser User-Agent. */
  browser?: boolean;
  parser: ParserName | EventParserName;
  /** Parser yields calendar events (ts_events) instead of numeric series. */
  events?: boolean;
  dataset: string;
  /** Series whose max(obs_date) defines the dataset's latest_obs. */
  anchorSeries: string;
  needsEnv?: string;
};

const FRED_IDS = ["DGS10", "DFII10", "DTWEXBGS", "DEXINUS", "VIXCLS", "WALCL", "NFCI", "T10Y2Y", "DFF", "UNRATE", "CPIAUCSL", "DCOILBRENTEU", "BAMLH0A0HYM2"];
const fred = (id: string): SourceCfg => ({
  id: `fred_${id.toLowerCase()}`,
  urls: () => [`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${process.env.FRED_API_KEY ?? ""}&file_type=json`],
  perDate: false, fmt: "json", freq: "daily", lagDays: 7, parser: "fredObs", dataset: "fred", anchorSeries: `ts_fred_${id.toLowerCase()}`, needsEnv: "FRED_API_KEY",
});

/** Source registry (CLAUDE_BUILD_SPEC §3 subset with verified parsers). Extend with new rows + parsers. */
export const SOURCES: SourceCfg[] = [
  {
    id: "nse_fiidii", urls: () => ["https://www.nseindia.com/api/fiidiiTradeReact"], perDate: false, fmt: "json", freq: "daily", lagDays: 4,
    nseCookie: true, parser: "nseFiidii", dataset: "nse_fiidii", anchorSeries: "ts_flows_fii_net",
  },
  {
    id: "nse_participant_oi", urls: (d) => [`https://nsearchives.nseindia.com/content/nsccl/fao_participant_oi_${fmtDmy(d!)}.csv`], perDate: true, fmt: "csv", freq: "daily", lagDays: 4,
    parser: "nseParticipantOi", dataset: "nse_participant_oi", anchorSeries: "ts_fno_fii_index_fut_net",
  },
  {
    id: "nse_bhavcopy", urls: (d) => [`https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${fmtYmd(d!)}_F_0000.csv.zip`], perDate: true, fmt: "zip-csv", freq: "daily", lagDays: 4,
    parser: "nseBhavcopy", dataset: "nse_bhavcopy", anchorSeries: "ts_breadth_advances",
  },
  ...FRED_IDS.map(fred),
];

const DMY_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const niftyDate = (iso: string) => `${iso.slice(8, 10)}-${DMY_MON[Number(iso.slice(5, 7)) - 1]}-${iso.slice(0, 4)}`;

/** niftyindices.com indices: [slug, display name as the backend expects]. */
export const NIFTY_INDICES: [string, string][] = [
  ["nifty50", "NIFTY 50"], ["nifty500", "NIFTY 500"], ["niftymidcap150", "NIFTY MIDCAP 150"],
  ["niftysmallcap250", "NIFTY SMALLCAP 250"], ["niftybank", "NIFTY BANK"], ["niftyit", "NIFTY IT"],
];

const niftyHeaders = {
  "content-type": "application/json; charset=UTF-8",
  accept: "application/json, text/javascript, */*; q=0.01",
  origin: "https://www.niftyindices.com",
  referer: "https://www.niftyindices.com/reports/historical-data",
  "x-requested-with": "XMLHttpRequest",
};
/** The site's own pages send cinfo as a single-quoted pseudo-JSON string; standard JSON is kept as the alt. */
const niftyReq = (path: string, kind: "tri" | "pepb") => (c: ReqCtx): Req[] =>
  NIFTY_INDICES.map(([slug, name]) => {
    const f = { name, startDate: niftyDate(c.latest ? addDays(c.latest, 1) : "2005-01-01"), endDate: niftyDate(c.today), indexName: name };
    const url = `https://www.niftyindices.com/Backpage.aspx/${path}`;
    const single = `{'name':'${f.name}','startDate':'${f.startDate}','endDate':'${f.endDate}','indexName':'${f.indexName}'}`;
    const base = { url, method: "POST" as const, headers: niftyHeaders, meta: { slug, kind } };
    return { ...base, body: JSON.stringify({ cinfo: single }), alt: { ...base, body: JSON.stringify({ cinfo: JSON.stringify(f) }) } };
  });

SOURCES.push(
  {
    id: "ecb", urls: () => ["https://data-api.ecb.europa.eu/service/data/EXR/D.INR.EUR.SP00.A?format=csvdata&startPeriod=2000-01-01"], perDate: false, fmt: "csv", freq: "daily", lagDays: 6,
    parser: "ecbEurInr", dataset: "ecb", anchorSeries: "ts_ecb_eurinr",
  },
  {
    id: "bis", urls: () => ["IN", "US", "XM", "GB", "JP"].map((a) => `https://stats.bis.org/api/v1/data/WS_CBPOL/M.${a}?format=csv`), perDate: false, fmt: "csv", freq: "monthly", lagDays: 60,
    parser: "bisPolicy", dataset: "bis", anchorSeries: "ts_bis_policy_in",
  },
);

const WB_COUNTRIES = "IND;USA;CHN;JPN;DEU;GBR;BRA;IDN";
const wb = (ind: string) => `https://api.worldbank.org/v2/country/${WB_COUNTRIES}/indicator/${ind}?format=json&per_page=2000&date=1990:2030`;
SOURCES.push(
  {
    id: "worldbank", urls: () => [wb("NY.GDP.MKTP.KD.ZG"), wb("FP.CPI.TOTL.ZG")], perDate: false, fmt: "json", freq: "monthly", lagDays: 400,
    parser: "worldBank", dataset: "worldbank", anchorSeries: "ts_wb_gdp_growth_ind",
  },
  {
    id: "nse_holidays", urls: () => ["https://www.nseindia.com/api/holiday-master?type=trading"], perDate: false, fmt: "json", freq: "monthly", lagDays: 400,
    nseCookie: true, parser: "nseHolidays", events: true, dataset: "nse_holidays", anchorSeries: "events:holiday",
  },
  {
    id: "nse_corp_actions", urls: () => ["https://www.nseindia.com/api/corporates-corporateActions?index=equities"], perDate: false, fmt: "json", freq: "daily", lagDays: 45,
    nseCookie: true, parser: "nseCorpActions", events: true, dataset: "nse_corp_actions", anchorSeries: "events:action",
  },
);

/** NSE allIndices: current P/E, P/B, yield for every index. A daily snapshot, so history builds from first run (niftyindices backfills older). */
SOURCES.push({
  id: "nse_allindices", urls: () => ["https://www.nseindia.com/api/allIndices"], perDate: false, fmt: "json", freq: "daily", lagDays: 4,
  nseCookie: true, parser: "nseAllIndices", dataset: "nse_allindices", anchorSeries: "ts_niftyidx_nifty50_pe",
});

/**
 * Disabled, kept for reference (not run, not scheduled):
 * - niftyindices_*: after the site redesign the Backpage.aspx endpoints return the home page (HTTP 200, title "NIFTY Indices") from GitHub runners.
 * - oecd: sdmx.oecd.org answers HTTP 500 via Cloudflare to both request shapes from GitHub runners.
 * Re-enable by moving an entry into SOURCES once a working request shape is known.
 */
export const DISABLED_SOURCES: SourceCfg[] = [
  {
    id: "niftyindices_tri", urls: () => [], reqs: niftyReq("getTotalReturnIndexString", "tri"), perDate: false, fmt: "json", freq: "daily", lagDays: 4, warm: "https://www.niftyindices.com/reports/historical-data", browser: true,
    parser: "niftyIndices", dataset: "niftyindices", anchorSeries: "ts_niftyidx_nifty50_tri",
  },
  {
    id: "niftyindices_pepb", urls: () => [], reqs: niftyReq("getpepbHistoricaldataDBtoString", "pepb"), perDate: false, fmt: "json", freq: "daily", lagDays: 4, warm: "https://www.niftyindices.com/reports/historical-data", browser: true,
    parser: "niftyIndices", dataset: "niftyindices", anchorSeries: "ts_niftyidx_nifty50_pe",
  },
  {
    id: "oecd", urls: () => [],
    reqs: () => ["IND", "USA", "CHN", "DEU", "JPN", "GBR"].map((c): Req => {
      const base = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/${c}.M.LI...AA...H?startPeriod=2000-01`;
      return { url: `${base}&format=csvfile`, alt: { url: base, headers: { accept: "application/vnd.sdmx.data+csv; charset=utf-8; version=2" } } };
    }), perDate: false, fmt: "csv", freq: "monthly", lagDays: 75,
    parser: "oecdCli", dataset: "oecd", anchorSeries: "ts_oecd_cli_ind",
  },
];

/** NSE historical index closes via daily ind_close_all_{DDMMYYYY}.csv archives. */
SOURCES.push({
  id: "nse_indexhistory",
  urls: (d) => [`https://nsearchives.nseindia.com/content/indices/ind_close_all_${fmtDmy(d!)}.csv`],
  perDate: true,
  fmt: "csv",
  freq: "daily",
  lagDays: 4,
  parser: "nseIndexHistory",
  dataset: "nse_indexhistory",
  anchorSeries: "ts_niftyidx_nifty50_px",
});

/** AMFI NAVAll.txt: daily NAV snapshots for tracked ETFs and Index funds. */
SOURCES.push({
  id: "amfi_nav",
  urls: () => ["https://portal.amfiindia.com/spages/NAVAll.txt"],
  perDate: false,
  fmt: "text",
  freq: "daily",
  lagDays: 1,
  parser: "amfiNav",
  dataset: "amfi_nav",
  anchorSeries: "ts_etf_niftybees_nav",
});

/** AMFI monthly reports: industry AUM by category, net flows, and NFO collections. */
SOURCES.push({
  id: "amfi_monthly",
  urls: () => ["https://portal.amfiindia.com/spages/amsep2026repo.xls"],
  perDate: false,
  fmt: "binary",
  freq: "monthly",
  lagDays: 45,
  parser: "amfiMonthly",
  dataset: "amfi_monthly",
  anchorSeries: "ts_amfi_aum_total",
});

/** AMFI SIP trends: monthly SIP inflows and stoppage ratio. */
SOURCES.push({
  id: "amfi_sip",
  urls: () => ["https://www.amfiindia.com/mutual-fund"],
  perDate: false,
  fmt: "html",
  freq: "monthly",
  lagDays: 45,
  parser: "amfiSip",
  dataset: "amfi_sip",
  anchorSeries: "ts_amfi_sip_inflow",
});

/** MoSPI macro: CPI, WPI, IIP, GDP, and PLFS from official eSankhyiki APIs. */
SOURCES.push({
  id: "mospi",
  urls: () => ["https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2012&series=Current&sector_code=3&state_code=99&limit=100"],
  reqs: () => [
    { url: "https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2012&series=Current&sector_code=3&state_code=99&limit=100", meta: { kind: "cpi" } },
    { url: "https://api.mospi.gov.in/api/wpi/getWpiRecords?base_year=2011-12&major_group_code=1000000000&Format=JSON", meta: { kind: "wpi" } },
    { url: "https://api.mospi.gov.in/api/iip/getIipData?base_year=2011-12&frequency=Monthly&type=General&Format=JSON", meta: { kind: "iip" } },
    { url: "https://api.mospi.gov.in/api/nas/getNASData?base_year=2011-12&series=Current&frequency_code=Quarterly&indicator_code=22&Format=JSON", meta: { kind: "gdp" } },
    { url: "https://api.mospi.gov.in/api/plfs/getData?indicator_code=3&frequency_code=2&state_code=99&sector_code=2&gender_code=3&Format=JSON", meta: { kind: "plfs" } },
  ],
  perDate: false,
  fmt: "json",
  freq: "monthly",
  lagDays: 60,
  parser: "mospi",
  dataset: "mospi",
  anchorSeries: "ts_mospi_cpi_yoy",
});

/** RBI Weekly Statistical Supplement & Market Trends (Home rates widget + MMO). */
SOURCES.push({
  id: "rbi_wss",
  urls: () => ["https://www.rbi.org.in/"],
  reqs: () => [
    { url: "https://www.rbi.org.in/" },
    { url: "https://www.rbi.org.in/Scripts/BS_ViewMMO.aspx" },
  ],
  perDate: false,
  fmt: "html",
  freq: "weekly",
  lagDays: 7,
  parser: "rbiWss",
  dataset: "rbi_wss",
  anchorSeries: "ts_rbi_repo",
});

/**
 * RBI DBIE & Data Releases:
 * - Sectoral Deployment of Bank Credit: https://www.rbi.org.in/scripts/Data_Sectoral_Deployment.aspx
 * - Lending and Deposit Rates of Scheduled Commercial Banks (WALR): https://www.rbi.org.in/Scripts/Pr_DataRelease.aspx?SectionID=369&DateFilter=Year
 * - Monetary Policy Committee Meeting Minutes: https://www.rbi.org.in/scripts/Annualpolicy.aspx
 */
SOURCES.push({
  id: "rbi_dbie",
  urls: () => ["https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63697"],
  reqs: () => [
    { url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63697" },
    { url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63702" },
    { url: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63839" },
  ],
  perDate: false,
  fmt: "html",
  freq: "monthly",
  lagDays: 45,
  parser: "rbiDbie",
  dataset: "rbi_dbie",
  anchorSeries: "ts_rbi_credit_growth",
});
