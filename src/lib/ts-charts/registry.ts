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
};

const ind = (id: string, title: string, dataset: string, col: string, fmt: Fmt, digits: number, source: string, page: string): ChartDef => ({
  id, kind: "indicator", title, dataset, series: [{ col, label: title }], fmt, digits, band: "p10p90", source, page,
});

/**
 * Chart registry. Only rows whose series ids are actually produced by a ts-ingest parser belong here;
 * extend alongside new parsers (CLAUDE_BUILD_SPEC §6.4). Unknown / empty series render "Source unavailable".
 */
export const REGISTRY: ChartDef[] = [
  ind("i.us10y", "US 10-year yield", "fred", "ts_fred_dgs10", "pct", 2, "FRED", "/macro/global"),
  ind("i.us_real10y", "US 10-year real yield", "fred", "ts_fred_dfii10", "pct", 2, "FRED", "/macro/global"),
  ind("i.dxy_broad", "Broad US dollar index", "fred", "ts_fred_dtwexbgs", "num", 1, "FRED", "/macro/global"),
  ind("i.nfci", "Chicago Fed financial conditions", "fred", "ts_fred_nfci", "num", 2, "FRED", "/macro/stress"),
  {
    id: "flows.cum_by_type", kind: "line", title: "Cumulative net cash purchases, FII vs DII", dataset: "nse_fiidii", fmt: "crore", digits: 0,
    transform: { type: "cumsum" },
    series: [{ col: "ts_flows_fii_net", label: "FII" }, { col: "ts_flows_dii_net", label: "DII" }], source: "NSE India (since collection began)", page: "/intelligence/institutional",
  },
  {
    id: "mk.advances_declines", kind: "line", title: "Advancing vs declining stocks", dataset: "nse_bhavcopy", fmt: "count", digits: 0,
    series: [{ col: "ts_breadth_advances", label: "Advances" }, { col: "ts_breadth_declines", label: "Declines" }], source: "NSE bhavcopy", page: "/markets/breadth",
  },
  {
    id: "act.fno_index_fut_net", kind: "line", title: "Net index futures OI by participant", dataset: "nse_participant_oi", fmt: "int", digits: 0,
    series: [{ col: "ts_fno_fii_index_fut_net", label: "FII" }, { col: "ts_fno_dii_index_fut_net", label: "DII" }, { col: "ts_fno_pro_index_fut_net", label: "Pro" }, { col: "ts_fno_client_index_fut_net", label: "Client" }],
    source: "NSE participant OI", page: "/markets/derivatives",
  },
];

export const getChartDef = (id: string) => REGISTRY.find((c) => c.id === id);
