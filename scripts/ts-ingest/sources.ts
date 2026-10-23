import { fmtDmy, fmtYmd } from "./dates";
import type { ParserName } from "./parsers";

export type SourceCfg = {
  id: string;
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
