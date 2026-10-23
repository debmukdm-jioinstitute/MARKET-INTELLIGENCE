import { addDays, fmtDmy, fmtYmd } from "./dates";
import type { ParserName } from "./parsers";

export type Req = { url: string; method?: "GET" | "POST"; body?: string; headers?: Record<string, string>; meta?: Record<string, string> };
export type ReqCtx = { date?: string; latest: string | null; today: string };

export type SourceCfg = {
  id: string;
  /** Preferred over `urls` when set: full request specs (POST bodies, per-index metadata). */
  reqs?: (c: ReqCtx) => Req[];
  /** One request per candidate date (daily-by-date archives) or a single url for snapshot APIs. */
  urls: (d?: string) => string[];
  perDate: boolean;
  fmt: "csv" | "zip-csv" | "json";
  freq: "daily" | "weekly" | "monthly";
  /** Dataset staleness tolerance in days before state flips current → behind. */
  lagDays: number;
  nseCookie?: boolean;
  parser: ParserName;
  dataset: string;
  /** Series whose max(obs_date) defines the dataset's latest_obs. */
  anchorSeries: string;
  needsEnv?: string;
};

const FRED_IDS = ["DGS10", "DFII10", "DTWEXBGS", "DEXINUS", "VIXCLS", "WALCL", "NFCI"];
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

const niftyReq = (path: string, kind: "tri" | "pepb") => (c: ReqCtx): Req[] =>
  NIFTY_INDICES.map(([slug, name]) => ({
    url: `https://www.niftyindices.com/Backpage.aspx/${path}`,
    method: "POST" as const,
    headers: { "content-type": "application/json; charset=UTF-8", referer: "https://www.niftyindices.com/reports/historical-data", "x-requested-with": "XMLHttpRequest" },
    body: JSON.stringify({ cinfo: JSON.stringify({ name, startDate: niftyDate(c.latest ? addDays(c.latest, 1) : "2005-01-01"), endDate: niftyDate(c.today), indexName: name }) }),
    meta: { slug, kind },
  }));

SOURCES.push(
  {
    id: "niftyindices_tri", urls: () => [], reqs: niftyReq("getTotalReturnIndexString", "tri"), perDate: false, fmt: "json", freq: "daily", lagDays: 4,
    parser: "niftyIndices", dataset: "niftyindices", anchorSeries: "ts_niftyidx_nifty50_tri",
  },
  {
    id: "niftyindices_pepb", urls: () => [], reqs: niftyReq("getpepbHistoricaldataDBtoString", "pepb"), perDate: false, fmt: "json", freq: "daily", lagDays: 4,
    parser: "niftyIndices", dataset: "niftyindices", anchorSeries: "ts_niftyidx_nifty50_pe",
  },
  {
    id: "ecb", urls: () => ["https://data-api.ecb.europa.eu/service/data/EXR/D.INR.EUR.SP00.A?format=csvdata&startPeriod=2000-01-01"], perDate: false, fmt: "csv", freq: "daily", lagDays: 6,
    parser: "ecbEurInr", dataset: "ecb", anchorSeries: "ts_ecb_eurinr",
  },
  {
    id: "bis", urls: () => ["IN", "US", "XM", "GB", "JP"].map((a) => `https://stats.bis.org/api/v1/data/WS_CBPOL/M.${a}?format=csv`), perDate: false, fmt: "csv", freq: "monthly", lagDays: 60,
    parser: "bisPolicy", dataset: "bis", anchorSeries: "ts_bis_policy_in",
  },
  {
    id: "oecd", urls: () => ["https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/IND+USA+CHN+DEU+JPN+GBR.M.LI...AA...H?format=csvfile&startPeriod=2000-01"], perDate: false, fmt: "csv", freq: "monthly", lagDays: 75,
    parser: "oecdCli", dataset: "oecd", anchorSeries: "ts_oecd_cli_ind",
  },
);
