import { unzipSync } from "fflate";
import type { SeriesResult } from "@/lib/collector/types";
import { parseDmy } from "./dates";

export type ParseCtx = { date?: string; url: string; meta?: Record<string, string> };
export type Parser = (buf: Buffer, ctx: ParseCtx) => SeriesResult[];

const num = (v: unknown): number | null => {
  const s = String(v ?? "").replace(/[,\s]/g, "");
  if (!s || ["-", "NA", "."].includes(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const stripBom = (s: string) => s.replace(/^﻿/, "");

/** Minimal CSV line splitter honouring double quotes. */
export function csvRows(text: string): string[][] {
  return stripBom(text).split(/\r?\n/).filter((l) => l.trim()).map((l) => {
    const out: string[] = [];
    let cur = "", q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}

export function firstCsvInZip(buf: Buffer): string {
  const files = unzipSync(new Uint8Array(buf));
  const name = Object.keys(files).find((n) => n.toLowerCase().endsWith(".csv"));
  if (!name) throw new Error("zip has no .csv");
  return Buffer.from(files[name]).toString("utf8");
}

const mk = (id: string, label: string, unit: string, provider: string, url: string, date: string, value: number, category: SeriesResult["category"] = "market"): SeriesResult =>
  ({ id, label, unit, category, provider, url, obs: [{ date, value }] });

/** NSE fiidiiTradeReact: [{category,date "DD-Mon-YYYY",buyValue,sellValue,netValue}] ₹ cr. */
export const nseFiidii: Parser = (buf, ctx) => {
  const rows = JSON.parse(stripBom(buf.toString("utf8"))) as { category?: string; date?: string; netValue?: string }[];
  const out: SeriesResult[] = [];
  for (const [key, label] of [["FII", "FII/FPI"], ["DII", "DII"]] as const) {
    const r = rows.find((x) => (x.category ?? "").toUpperCase().includes(key));
    const d = parseDmy(r?.date), v = num(r?.netValue);
    if (d && v != null) out.push(mk(`ts_flows_${key.toLowerCase()}_net`, `${label} net cash flow`, "₹ cr", "NSE India", ctx.url, d, v));
  }
  return out;
};

/** fao_participant_oi_DDMMYYYY.csv: row1 title, row2 header, rows Client/DII/FII/Pro/TOTAL. */
export const nseParticipantOi: Parser = (buf, ctx) => {
  if (!ctx.date) throw new Error("participant OI needs a date");
  const rows = csvRows(buf.toString("utf8"));
  const hi = rows.findIndex((r) => r[0]?.toLowerCase().startsWith("client type"));
  if (hi < 0) throw new Error("participant OI header not found");
  const head = rows[hi].map((h) => h.toLowerCase());
  const col = (p: string) => head.findIndex((h) => h.includes(p));
  const iFl = col("future index long"), iFs = col("future index short");
  const out: SeriesResult[] = [];
  for (const r of rows.slice(hi + 1)) {
    const who = r[0]?.toLowerCase();
    if (!["client", "dii", "fii", "pro"].includes(who)) continue;
    const l = num(r[iFl]), s = num(r[iFs]);
    if (l != null && s != null) out.push(mk(`ts_fno_${who}_index_fut_net`, `${r[0]} net index futures OI`, "contracts", "NSE India", ctx.url, ctx.date, l - s, "positioning"));
  }
  return out;
};

/** Bhavcopy zip: advances / declines / unchanged on EQ series + total traded value (₹ cr). */
export const nseBhavcopy: Parser = (buf, ctx) => {
  if (!ctx.date) throw new Error("bhavcopy needs a date");
  const rows = csvRows(firstCsvInZip(buf));
  const h = rows[0].map((x) => x.trim());
  const ix = (n: string) => h.indexOf(n);
  const [iS, iC, iP, iV] = [ix("SctySrs"), ix("ClsPric"), ix("PrvsClsgPric"), ix("TtlTrfVal")];
  if ([iS, iC, iP].some((i) => i < 0)) throw new Error("bhavcopy columns missing");
  let adv = 0, dec = 0, unch = 0, val = 0;
  for (const r of rows.slice(1)) {
    if (!["EQ", "BE", "BZ"].includes(r[iS])) continue;
    const c = num(r[iC]), p = num(r[iP]);
    if (c == null || p == null) continue;
    if (c > p) adv++; else if (c < p) dec++; else unch++;
    val += num(r[iV]) ?? 0;
  }
  if (adv + dec + unch === 0) return [];
  const d = ctx.date, p = "NSE bhavcopy";
  return [
    mk("ts_breadth_advances", "Advancing stocks (EQ/BE/BZ)", "count", p, ctx.url, d, adv),
    mk("ts_breadth_declines", "Declining stocks (EQ/BE/BZ)", "count", p, ctx.url, d, dec),
    mk("ts_breadth_unchanged", "Unchanged stocks (EQ/BE/BZ)", "count", p, ctx.url, d, unch),
    mk("ts_cash_traded_value", "Cash market traded value", "₹ cr", p, ctx.url, d, val / 1e7),
  ];
};

/** FRED observations JSON; "." = missing → skipped. Series id/name come from ctx.url. */
export const fredObs: Parser = (buf, ctx) => {
  const id = new URL(ctx.url).searchParams.get("series_id");
  if (!id) throw new Error("fred url lacks series_id");
  const j = JSON.parse(buf.toString("utf8")) as { observations?: { date: string; value: string }[] };
  const obs = (j.observations ?? []).flatMap((o) => { const v = num(o.value); return v == null ? [] : [{ date: o.date, value: v }]; });
  return [{ id: `ts_fred_${id.toLowerCase()}`, label: `FRED ${id}`, unit: "", category: "macro", provider: "FRED", url: ctx.url.replace(/api_key=[^&]+/, "api_key=***"), obs }];
};

/** niftyindices "DD Mon YYYY" / "DD-Mon-YYYY" → ISO. */
const nDate = (s: string | undefined) => parseDmy(String(s ?? "").trim().replace(/\s+/g, "-"));

/** niftyindices backend: body `{d: "<json string>"}`. TRI rows {Date,TotalReturnsIndex}; PE/PB rows {DATE,pe,pb,divYield}. */
export const niftyIndices: Parser = (buf, ctx) => {
  const slug = ctx.meta?.slug, kind = ctx.meta?.kind;
  if (!slug || !kind) throw new Error("niftyIndices needs meta.slug/kind");
  const outer = JSON.parse(stripBom(buf.toString("utf8"))) as { d?: string };
  const rows = JSON.parse(outer.d ?? "[]") as Record<string, string>[];
  const pick = (r: Record<string, string>, k: string) => r[Object.keys(r).find((x) => x.toLowerCase() === k.toLowerCase()) ?? ""];
  const mkS = (suffix: string, label: string, unit: string, f: (r: Record<string, string>) => string | undefined): SeriesResult => ({
    id: `ts_niftyidx_${slug}_${suffix}`, label: `${label}`, unit, category: "valuation", provider: "NSE Indices", url: ctx.url,
    obs: rows.flatMap((r) => { const d = nDate(pick(r, "date")), v = num(f(r)); return d && v != null ? [{ date: d, value: v }] : []; }),
  });
  if (kind === "tri") return [mkS("tri", `${slug} total return index`, "index", (r) => pick(r, "TotalReturnsIndex"))];
  return [mkS("pe", `${slug} P/E`, "x", (r) => pick(r, "pe")), mkS("pb", `${slug} P/B`, "x", (r) => pick(r, "pb"))].filter((s) => s.obs.length);
};

/** ECB SDMX csvdata: columns TIME_PERIOD, OBS_VALUE. */
export const ecbEurInr: Parser = (buf, ctx) => {
  const rows = csvRows(buf.toString("utf8"));
  const h = rows[0], iT = h.indexOf("TIME_PERIOD"), iV = h.indexOf("OBS_VALUE");
  if (iT < 0 || iV < 0) throw new Error("ecb columns missing");
  const obs = rows.slice(1).flatMap((r) => { const v = num(r[iV]); return /^\d{4}-\d{2}-\d{2}$/.test(r[iT] ?? "") && v != null ? [{ date: r[iT], value: v }] : []; });
  return [{ id: "ts_ecb_eurinr", label: "EUR/INR reference rate", unit: "₹ per €", category: "market", provider: "ECB", url: ctx.url, obs }];
};

/** BIS WS_CBPOL monthly csv: REF_AREA, TIME_PERIOD (YYYY-MM), OBS_VALUE. */
export const bisPolicy: Parser = (buf, ctx) => {
  const rows = csvRows(buf.toString("utf8"));
  const h = rows[0], iA = h.indexOf("REF_AREA"), iT = h.indexOf("TIME_PERIOD"), iV = h.indexOf("OBS_VALUE");
  if (iA < 0 || iT < 0 || iV < 0) throw new Error("bis columns missing");
  const by = new Map<string, { date: string; value: number }[]>();
  for (const r of rows.slice(1)) {
    const v = num(r[iV]);
    if (v == null || !/^\d{4}-\d{2}/.test(r[iT] ?? "")) continue;
    const a = r[iA].toLowerCase();
    (by.get(a) ?? by.set(a, []).get(a)!).push({ date: `${r[iT].slice(0, 7)}-01`, value: v });
  }
  return [...by].map(([a, obs]) => ({ id: `ts_bis_policy_${a === "xm" ? "ea" : a}`, label: `Policy rate (${a.toUpperCase()})`, unit: "%", category: "rates" as const, provider: "BIS", url: ctx.url, obs }));
};

/** OECD CLI csvfile: REF_AREA, TIME_PERIOD (YYYY-MM), OBS_VALUE. */
export const oecdCli: Parser = (buf, ctx) => {
  const rows = csvRows(buf.toString("utf8"));
  const h = rows[0], iA = h.indexOf("REF_AREA"), iT = h.indexOf("TIME_PERIOD"), iV = h.indexOf("OBS_VALUE");
  if (iA < 0 || iT < 0 || iV < 0) throw new Error("oecd columns missing");
  const by = new Map<string, { date: string; value: number }[]>();
  for (const r of rows.slice(1)) {
    const v = num(r[iV]);
    if (v == null || !/^\d{4}-\d{2}/.test(r[iT] ?? "")) continue;
    const a = r[iA].toLowerCase();
    (by.get(a) ?? by.set(a, []).get(a)!).push({ date: `${r[iT].slice(0, 7)}-01`, value: v });
  }
  return [...by].map(([a, obs]) => ({ id: `ts_oecd_cli_${a}`, label: `Composite leading indicator (${a.toUpperCase()})`, unit: "index", category: "macro" as const, provider: "OECD", url: ctx.url, obs }));
};

export type EventRow = { id: string; kind: string; symbol: string | null; title: string; event_date: string; meta?: Record<string, unknown> };
export type EventParser = (buf: Buffer, ctx: ParseCtx) => EventRow[];

/** NSE holiday-master?type=trading → {CM:[{tradingDate:"DD-Mon-YYYY",description,...}]}. */
export const nseHolidays: EventParser = (buf) => {
  const j = JSON.parse(stripBom(buf.toString("utf8"))) as { CM?: { tradingDate?: string; description?: string }[] };
  return (j.CM ?? []).flatMap((h) => {
    const d = parseDmy(h.tradingDate);
    return d ? [{ id: `holiday:${d}`, kind: "holiday", symbol: null, title: (h.description ?? "Market holiday").trim(), event_date: d }] : [];
  });
};

/** NSE corporates-corporateActions: [{symbol,subject,exDate,recDate,series,comp}]. kind from subject text. */
export const nseCorpActions: EventParser = (buf) => {
  const rows = JSON.parse(stripBom(buf.toString("utf8"))) as { symbol?: string; subject?: string; exDate?: string; recDate?: string; comp?: string }[];
  return rows.flatMap((r) => {
    const d = parseDmy(r.exDate);
    if (!d || !r.symbol || !r.subject) return [];
    const t = r.subject.toLowerCase();
    const kind = t.includes("dividend") ? "dividend" : t.includes("split") || t.includes("sub-division") ? "split" : t.includes("bonus") ? "bonus" : t.includes("rights") ? "rights" : t.includes("buyback") || t.includes("buy back") ? "buyback" : "action";
    return [{ id: `${kind}:${r.symbol}:${d}:${r.subject.slice(0, 40)}`, kind, symbol: r.symbol, title: r.subject.trim(), event_date: d, meta: { company: r.comp ?? null, recordDate: parseDmy(r.recDate) } }];
  });
};
export const EVENT_PARSERS = { nseHolidays, nseCorpActions } satisfies Record<string, EventParser>;
export type EventParserName = keyof typeof EVENT_PARSERS;

/** World Bank API: [meta, [{countryiso3code,date:"2023",value}]] → one series per country, dated YYYY-12-31. */
export const worldBank: Parser = (buf, ctx) => {
  const ind = new URL(ctx.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  const j = JSON.parse(stripBom(buf.toString("utf8"))) as [unknown, { countryiso3code?: string; date?: string; value?: number | null }[] | null];
  const by = new Map<string, { date: string; value: number }[]>();
  for (const r of j[1] ?? []) {
    if (r.value == null || !r.countryiso3code || !/^\d{4}$/.test(r.date ?? "")) continue;
    const k = r.countryiso3code.toLowerCase();
    (by.get(k) ?? by.set(k, []).get(k)!).push({ date: `${r.date}-12-31`, value: r.value });
  }
  const label = ind === "NY.GDP.MKTP.KD.ZG" ? "Real GDP growth" : ind === "FP.CPI.TOTL.ZG" ? "CPI inflation" : ind;
  const key = ind === "NY.GDP.MKTP.KD.ZG" ? "gdp_growth" : ind === "FP.CPI.TOTL.ZG" ? "cpi" : ind.toLowerCase().replace(/\W/g, "_");
  return [...by].map(([c, obs]) => ({ id: `ts_wb_${key}_${c}`, label: `${label} (${c.toUpperCase()})`, unit: "%", category: "macro" as const, provider: "World Bank", url: ctx.url, obs: obs.sort((a, b) => a.date.localeCompare(b.date)) }));
};

const NIFTY_SLUGS: Record<string, string> = {
  "NIFTY 50": "nifty50", "NIFTY 500": "nifty500", "NIFTY MIDCAP 150": "niftymidcap150",
  "NIFTY SMALLCAP 250": "niftysmallcap250", "NIFTY BANK": "niftybank", "NIFTY IT": "niftyit",
};
/** NSE allIndices: {data:[{index,pe,pb,dy,...}], timestamp:"23-Oct-2026 15:30:00"} → P/E and P/B points for the tracked indices. */
export const nseAllIndices: Parser = (buf, ctx) => {
  const j = JSON.parse(stripBom(buf.toString("utf8"))) as { data?: { index?: string; indexSymbol?: string; pe?: string | number; pb?: string | number }[]; timestamp?: string };
  const date = parseDmy(String(j.timestamp ?? "").trim().split(/\s+/)[0]);
  if (!date) throw new Error("allIndices timestamp missing");
  const out: SeriesResult[] = [];
  for (const r of j.data ?? []) {
    const slug = NIFTY_SLUGS[String(r.index ?? "").toUpperCase()];
    if (!slug) continue;
    const pe = num(r.pe), pb = num(r.pb);
    if (pe != null && pe > 0) out.push(mk(`ts_niftyidx_${slug}_pe`, `${slug} P/E`, "x", "NSE India (allIndices)", ctx.url, date, pe, "valuation"));
    if (pb != null && pb > 0) out.push(mk(`ts_niftyidx_${slug}_pb`, `${slug} P/B`, "x", "NSE India (allIndices)", ctx.url, date, pb, "valuation"));
  }
  return out;
};

/** NSE historical index closes: supports ind_close_all_*.csv archives or JSON indicesHistory. */
export const nseIndexHistory: Parser = (buf, ctx) => {
  const text = stripBom(buf.toString("utf8")).trim();
  if (text.startsWith("{")) {
    const slug = ctx.meta?.slug;
    if (!slug) throw new Error("nseIndexHistory needs meta.slug");
    const j = JSON.parse(text) as { data?: { indexCloseOnlineRecords?: Record<string, unknown>[] } | Record<string, unknown>[] };
    const recs = (Array.isArray(j.data) ? j.data : j.data?.indexCloseOnlineRecords) ?? [];
    const obs = recs.flatMap((r) => {
      const raw = String(r.EOD_TIMESTAMP ?? r.TIMESTAMP ?? r.timestamp ?? "");
      const d = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : parseDmy(raw);
      const v = num(r.EOD_CLOSE_INDEX_VAL ?? r.CLOSE ?? r.close);
      return d && v != null ? [{ date: d, value: v }] : [];
    });
    return [{ id: `ts_niftyidx_${slug}_px`, label: `${slug} price index`, unit: "index", category: "market", provider: "NSE India", url: ctx.url, obs }];
  }

  const rows = csvRows(text);
  if (!rows.length) return [];
  const h = rows[0].map((c) => c.toLowerCase());
  const iName = h.findIndex((c) => c.includes("index name"));
  const iDate = h.findIndex((c) => c.includes("index date"));
  const iClose = h.findIndex((c) => c.includes("closing index value"));
  const iPe = h.findIndex((c) => c === "p/e");
  const iPb = h.findIndex((c) => c === "p/b");
  if (iName < 0 || iClose < 0) throw new Error("ind_close_all columns missing");

  const out: SeriesResult[] = [];
  for (const r of rows.slice(1)) {
    const name = String(r[iName] ?? "").toUpperCase().replace(/\s+/g, " ").trim();
    const slug = NIFTY_SLUGS[name];
    if (!slug) continue;
    const d = (iDate >= 0 ? parseDmy(r[iDate]) : null) ?? ctx.date;
    const px = num(r[iClose]);
    if (!d || px == null) continue;
    out.push(mk(`ts_niftyidx_${slug}_px`, `${slug} price index`, "index", "NSE India", ctx.url, d, px, "market"));
    const pe = iPe >= 0 ? num(r[iPe]) : null;
    const pb = iPb >= 0 ? num(r[iPb]) : null;
    if (pe != null && pe > 0) out.push(mk(`ts_niftyidx_${slug}_pe`, `${slug} P/E`, "x", "NSE India", ctx.url, d, pe, "valuation"));
    if (pb != null && pb > 0) out.push(mk(`ts_niftyidx_${slug}_pb`, `${slug} P/B`, "x", "NSE India", ctx.url, d, pb, "valuation"));
  }
  return out;
};

export const PARSERS = { nseIndexHistory, nseAllIndices, worldBank, niftyIndices, ecbEurInr, bisPolicy, oecdCli, nseFiidii, nseParticipantOi, nseBhavcopy, fredObs } satisfies Record<string, Parser>;
export type ParserName = keyof typeof PARSERS;
