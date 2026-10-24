import { downsample, indicatorStats } from "./transform";
import type { Fmt } from "./format";
import type { ChartPayload, ChartKind } from "./types";

/**
 * RBI desk data: published JSON bundles from tipsheet.markets (RBI data, reused with RBI acknowledged as the source).
 * Bundle URLs carry a content hash that changes on every refresh, so the current URL is looked up from the /rbi/ page.
 * Chart ids are `tsr.*`; they are not in the DB-backed registry.
 */
const ORIGIN = "https://tipsheet.markets";
const PAGE = `${ORIGIN}/rbi/`;
const REVALIDATE = 3600;

type Def = {
  /** Bundle path under /data/v1/, no hash or extension. */
  key: string;
  kind: Extract<ChartKind, "line" | "bars">;
  title: string;
  fmt: Fmt;
  digits: number;
  series: { col: string; label: string }[];
  from?: string;
  /** Divide values (e.g. crore to thousand crore). */
  div?: number;
  /** Compute the usual (p10–p90) range and records from the first series. */
  band?: boolean;
};

const R = (p: string) => `rbi/${p}`;
export const TSR: Record<string, Def> = {
  "tsr.repo": { key: R("policy/corridor_weekly"), kind: "line", title: "RBI repo rate", fmt: "pct", digits: 2, series: [{ col: "repo", label: "Repo rate" }], band: true },
  "tsr.real_repo": { key: "macro/india/monetary/real_rates_monthly", kind: "line", title: "Real repo rate", fmt: "pct", digits: 2, series: [{ col: "real_repo", label: "Real repo rate" }], band: true },
  "tsr.crr_slr": { key: R("policy/corridor_weekly"), kind: "line", title: "What banks must set aside", fmt: "pct", digits: 2, series: [{ col: "crr", label: "Cash reserve ratio" }, { col: "slr", label: "Statutory liquidity ratio" }] },
  "tsr.call_gap": { key: R("liquidity/rates_weekly"), kind: "line", title: "Overnight money against the repo rate", fmt: "bps", digits: 0, from: "2011-05-06", series: [{ col: "wacr_minus_repo_bp", label: "Call rate minus repo" }], band: true },
  "tsr.call_daily": { key: R("liquidity/rates_daily_2y"), kind: "line", title: "The last two years, day by day", fmt: "pct", digits: 2, series: [{ col: "wacr", label: "Call rate" }, { col: "repo", label: "Repo rate" }] },
  "tsr.laf": { key: R("liquidity/laf_auctions_daily"), kind: "bars", title: "Cash the RBI adds or drains at auction", fmt: "num", digits: 0, from: "2024-01-01", div: 1000, series: [{ col: "net_auction_injection_cr", label: "Net cash added, ₹ thousand crore" }] },
  "tsr.walr": { key: R("transmission/monthly"), kind: "line", title: "What new loans cost", fmt: "pct", digits: 2, from: "2014-09-01", series: [{ col: "walr_fresh", label: "New loans" }, { col: "repo", label: "Repo rate" }], band: true },
  "tsr.wadtdr": { key: R("transmission/monthly"), kind: "line", title: "What new deposits earn", fmt: "pct", digits: 2, from: "2020-03-01", series: [{ col: "wadtdr_fresh", label: "New term deposits" }, { col: "repo", label: "Repo rate" }] },
  "tsr.m3": { key: R("money/m3_fortnightly"), kind: "line", title: "Broad money growth", fmt: "pct", digits: 1, series: [{ col: "m3_yoy", label: "M3 growth" }], band: true },
  "tsr.credit": { key: R("credit/sectoral_monthly"), kind: "line", title: "Bank lending: individuals against industry", fmt: "pct", digits: 1, from: "2020-01-01", series: [{ col: "personal_yoy", label: "Personal loans" }, { col: "industry_yoy", label: "Industry" }], band: true },
  "tsr.tbill": { key: R("gsec/tbill_auctions"), kind: "line", title: "Treasury bill cut-offs", fmt: "pct", digits: 2, series: [{ col: "tbill_91d_cutoff", label: "91-day bill" }, { col: "tbill_364d_cutoff", label: "364-day bill" }] },
  "tsr.sdl_cutoff": { key: R("sdl/auctions_weekly"), kind: "line", title: "What the states pay", fmt: "pct", digits: 2, series: [{ col: "wtd_cutoff_pct", label: "SDL cut-off" }] },
  "tsr.sdl_years": { key: R("sdl/auctions_weekly"), kind: "line", title: "How long the states borrow for", fmt: "num", digits: 1, series: [{ col: "wtd_years_to_maturity", label: "Years to maturity" }] },
  "tsr.reserves": { key: R("external/reserves_weekly"), kind: "line", title: "Foreign exchange reserves", fmt: "num", digits: 1, series: [{ col: "total_bn", label: "Reserves, US$ billion" }], band: true },
  "tsr.import_cover": { key: R("external/reserves_weekly"), kind: "line", title: "Import cover", fmt: "num", digits: 1, from: "2023-01-01", series: [{ col: "import_cover_months", label: "Months of imports" }], band: true },
  "tsr.fx": { key: R("external/fx_intervention_monthly"), kind: "bars", title: "The RBI in the currency market", fmt: "num", digits: 1, from: "2015-01-01", series: [{ col: "net_purchase_bn", label: "Net dollar purchases, US$ billion" }] },
  "tsr.bop": { key: R("external/bop_quarterly"), kind: "line", title: "The current account", fmt: "num", digits: 1, from: "2000-01-01", series: [{ col: "current_account_4q_bn", label: "Current account, four quarters, US$ billion" }] },
  "tsr.reer": { key: R("external/reer_monthly"), kind: "line", title: "The rupee against 40 currencies", fmt: "num", digits: 1, series: [{ col: "reer40", label: "Real (REER)" }, { col: "neer40", label: "Nominal (NEER)" }] },
};

export const isTsrId = (id: string) => Object.hasOwn(TSR, id);

async function pageHtml(): Promise<string> {
  const r = await fetch(PAGE, { next: { revalidate: REVALIDATE }, headers: { "User-Agent": "MarketIntelligence/1.0 (+https://getmarketintelligence.in)" } });
  if (!r.ok) throw new Error(`rbi source ${r.status}`);
  return r.text();
}

type Bundle = { dates: string[]; series: Record<string, (number | null)[]>; meta?: { source?: string } };

async function bundle(key: string): Promise<Bundle> {
  const m = (await pageHtml()).match(new RegExp(`/data/v1/${key}\\.[0-9a-f]{6,}\\.json`));
  if (!m) throw new Error(`bundle not listed: ${key}`);
  const r = await fetch(ORIGIN + m[0], { next: { revalidate: REVALIDATE } });
  if (!r.ok) throw new Error(`bundle ${r.status}`);
  return r.json();
}

export async function buildTsrChart(id: string): Promise<ChartPayload | null> {
  const def = TSR[id];
  if (!def) return null;
  const b = await bundle(def.key);
  const cols = def.series.map((s) => s.col);
  const k = def.div ?? 1;
  const all = b.dates
    .map((date, i) => {
      const row: ChartPayload["rows"][number] = { date };
      for (const c of cols) { const v = b.series[c]?.[i]; row[c] = v == null ? null : v / k; }
      return row;
    })
    .filter((r) => (!def.from || r.date >= def.from) && cols.some((c) => r[c] != null));
  const pts = all.filter((r) => r[cols[0]] != null).map((r) => ({ date: r.date, v: r[cols[0]] as number }));
  const st = def.band ? indicatorStats(pts) : null;
  const rows = downsample(all, 1500);
  return {
    id,
    kind: def.kind,
    title: def.title,
    source: `${b.meta?.source ?? "Reserve Bank of India"}; compiled by tipsheet.markets`,
    methodUrl: `${ORIGIN}/methods/rbi/`,
    updated: all.at(-1)?.date ?? "never",
    fmt: def.fmt,
    digits: def.digits,
    series: def.series,
    rows,
    band: st ? [st.bandLo, st.bandHi] : undefined,
    records: st ? { hi: st.recHi, lo: st.recLo } : undefined,
  };
}

export type RbiTable = { headers: string[]; rows: string[][] };
const ENT: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
const txt = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&[a-z]+;|&#39;/g, (e) => ENT[e] ?? e).replace(/\s+/g, " ").trim();

/** The five data tables on the source page, keyed by their first column header. */
export async function buildRbiTables(): Promise<Record<"mpc" | "passthrough" | "credit" | "gsec" | "sdl", RbiTable>> {
  const first: Record<string, "mpc" | "passthrough" | "credit" | "gsec" | "sdl"> = { Decided: "mpc", Rate: "passthrough", Sector: "credit", Auction: "gsec", "State or UT": "sdl" };
  const out = {} as Record<"mpc" | "passthrough" | "credit" | "gsec" | "sdl", RbiTable>;
  for (const [, t] of (await pageHtml()).matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)) {
    const rows = [...t.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) =>
      [...tr[1].matchAll(/<t([dh])\b([^>]*)>([\s\S]*?)<\/t\1>/g)].filter((c) => !/class="[^"]*\bmc\b/.test(c[2])).map((c) => txt(c[3])),
    );
    const key = first[rows[0]?.[0] ?? ""];
    if (key) out[key] = { headers: rows[0], rows: rows.slice(1) };
  }
  return out;
}
