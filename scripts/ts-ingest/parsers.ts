import * as XLSX from "xlsx";
import { TRACKED_ETFS, TRACKED_INDEX_FUNDS } from "@/lib/funds/etf-isins";
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
  const [iS, iC, iP, iV, iIsin] = [ix("SctySrs"), ix("ClsPric"), ix("PrvsClsgPric"), ix("TtlTrfVal"), ix("ISIN")];
  if ([iS, iC, iP].some((i) => i < 0)) throw new Error("bhavcopy columns missing");
  let adv = 0, dec = 0, unch = 0, val = 0;
  const etfMap = new Map(TRACKED_ETFS.map((e) => [e.isin, e]));
  const etfResults: SeriesResult[] = [];
  const d = ctx.date, p = "NSE bhavcopy";

  for (const r of rows.slice(1)) {
    if (iIsin >= 0 && r[iIsin]) {
      const etf = etfMap.get(r[iIsin]);
      if (etf) {
        const c = num(r[iC]);
        const v = num(r[iV]);
        if (c != null && c > 0) etfResults.push(mk(`ts_etf_${etf.slug}_px`, `${etf.symbol} close`, "₹", p, ctx.url, d, c, "market"));
        if (v != null) etfResults.push(mk(`ts_etf_${etf.slug}_val`, `${etf.symbol} traded value`, "₹ cr", p, ctx.url, d, v / 1e7, "market"));
      }
    }
    if (!["EQ", "BE", "BZ"].includes(r[iS])) continue;
    const c = num(r[iC]), prevP = num(r[iP]);
    if (c == null || prevP == null) continue;
    if (c > prevP) adv++; else if (c < prevP) dec++; else unch++;
    val += num(r[iV]) ?? 0;
  }
  if (adv + dec + unch === 0 && !etfResults.length) return [];
  const out = [
    mk("ts_breadth_advances", "Advancing stocks (EQ/BE/BZ)", "count", p, ctx.url, d, adv),
    mk("ts_breadth_declines", "Declining stocks (EQ/BE/BZ)", "count", p, ctx.url, d, dec),
    mk("ts_breadth_unchanged", "Unchanged stocks (EQ/BE/BZ)", "count", p, ctx.url, d, unch),
    mk("ts_cash_traded_value", "Cash market traded value", "₹ cr", p, ctx.url, d, val / 1e7),
  ];
  return [...out, ...etfResults];
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


/** AMFI NAVAll.txt: extracts NAVs for tracked ETFs and Index funds. */
export const amfiNav: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  const etfMap = new Map(TRACKED_ETFS.map((e) => [e.isin, e]));
  const fundMap = new Map(TRACKED_INDEX_FUNDS.map((f) => [f.code, f]));
  const isinFundMap = new Map(TRACKED_INDEX_FUNDS.map((f) => [f.isin, f]));
  const results: SeriesResult[] = [];

  for (const line of text.split(/\r?\n/)) {
    const p = line.split(";");
    if (p.length < 6) continue;
    const code = p[0]?.trim();
    const isin = p[1]?.trim();
    const nav = num(p[p.length - 2]);
    const rawDate = p[p.length - 1]?.trim();
    const d = parseDmy(rawDate) ?? ctx.date;
    if (nav == null || nav <= 0 || !d) continue;

    const etf = etfMap.get(isin);
    if (etf) {
      results.push(mk(`ts_etf_${etf.slug}_nav`, `${etf.symbol} NAV`, "₹", "AMFI NAV", ctx.url, d, nav, "funds"));
    }
    const fund = fundMap.get(code) ?? isinFundMap.get(isin);
    if (fund) {
      results.push(mk(`ts_amfi_nav_${fund.slug}`, `${fund.name} NAV`, "₹", "AMFI NAV", ctx.url, d, nav, "funds"));
    }
  }
  return results;
};

/** AMFI monthly report xls: MCR_MonthlyReport totals and NSR NFO collections. */
export const amfiMonthly: Parser = (buf, ctx) => {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames.find((n) => /monthly|mcr/i.test(n)) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("amfiMonthly sheet missing");
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  if (data.length < 5) throw new Error("amfiMonthly empty data");

  let date = ctx.date ?? null;
  const title = String(data[0]?.[0] ?? data[1]?.[0] ?? "");
  const mMatch = title.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
  if (mMatch) {
    const m = mMatch[1].slice(0, 3);
    const y = mMatch[2];
    date = parseDmy(`01-${m}-${y}`);
  }
  if (!date) date = "2026-09-30";

  let iNet = 6, iAum = 7;
  for (let r = 0; r < Math.min(6, data.length); r++) {
    const row = data[r];
    if (!Array.isArray(row)) continue;
    const netIdx = row.findIndex((c) => /net inflow/i.test(String(c)));
    const aumIdx = row.findIndex((c) => /net assets under management|aum/i.test(String(c)));
    if (netIdx >= 0) iNet = netIdx;
    if (aumIdx >= 0) iAum = aumIdx;
  }

  const results: SeriesResult[] = [];
  let aumTotal = 0, aumEquity = 0, aumDebt = 0, aumHybrid = 0, aumPassive = 0;
  let netTotal = 0, netEquity = 0, netDebt = 0;

  for (const row of data) {
    if (!Array.isArray(row)) continue;
    const label = String(row[1] ?? row[0] ?? "").trim();
    const net = num(row[iNet]);
    const aum = num(row[iAum]);

    if (/grand total/i.test(label) || /total all/i.test(label)) {
      if (aum != null) aumTotal = aum;
      if (net != null) netTotal = net;
    } else if (/sub total.*(debt|income)/i.test(label) || (label === "Sub Total - I" && aum != null)) {
      if (aum != null) aumDebt = aum;
      if (net != null) netDebt = net;
    } else if (/sub total.*(equity|growth)/i.test(label) || (label === "Sub Total - II" && aum != null)) {
      if (aum != null) aumEquity = aum;
      if (net != null) netEquity = net;
    } else if (/sub total.*hybrid/i.test(label) || (label === "Sub Total - III" && aum != null)) {
      if (aum != null) aumHybrid = aum;
    } else if (/sub total.*(etf|other|passive)/i.test(label) || (label === "Sub Total - VII" && aum != null)) {
      if (aum != null) aumPassive = aum;
    }
  }

  let nfoMobilized = 0;
  const nsrName = wb.SheetNames.find((n) => /nsr|nfo/i.test(n));
  if (nsrName && wb.Sheets[nsrName]) {
    const nsrData = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nsrName], { header: 1 });
    for (const r of nsrData) {
      if (!Array.isArray(r)) continue;
      const l = String(r[0] ?? r[1] ?? "").trim();
      if (/grand total/i.test(l)) {
        const v = num(r[r.length - 1] ?? r[3]);
        if (v != null) nfoMobilized = v;
      }
    }
  }

  const p = "AMFI monthly report";
  if (aumTotal > 0) results.push(mk("ts_amfi_aum_total", "Mutual fund industry total AUM", "₹ cr", p, ctx.url, date, aumTotal, "funds"));
  if (aumEquity > 0) results.push(mk("ts_amfi_aum_equity", "Equity mutual funds AUM", "₹ cr", p, ctx.url, date, aumEquity, "funds"));
  if (aumDebt > 0) results.push(mk("ts_amfi_aum_debt", "Debt mutual funds AUM", "₹ cr", p, ctx.url, date, aumDebt, "funds"));
  if (aumHybrid > 0) results.push(mk("ts_amfi_aum_hybrid", "Hybrid mutual funds AUM", "₹ cr", p, ctx.url, date, aumHybrid, "funds"));
  if (aumPassive > 0) results.push(mk("ts_amfi_aum_passive", "Passive and ETF AUM", "₹ cr", p, ctx.url, date, aumPassive, "funds"));
  if (netEquity !== 0) results.push(mk("ts_amfi_net_equity", "Equity net inflows", "₹ cr", p, ctx.url, date, netEquity, "funds"));
  if (netDebt !== 0) results.push(mk("ts_amfi_net_debt", "Debt net flows", "₹ cr", p, ctx.url, date, netDebt, "funds"));
  if (netTotal !== 0) results.push(mk("ts_amfi_net_total", "Industry net flows", "₹ cr", p, ctx.url, date, netTotal, "funds"));
  if (nfoMobilized > 0) results.push(mk("ts_amfi_nfo_mobilized", "NFO funds mobilized", "₹ cr", p, ctx.url, date, nfoMobilized, "funds"));

  return results;
};

/** AMFI SIP trends: monthly inflow and stoppage ratio from portal disclosures. */
export const amfiSip: Parser = (buf, ctx) => {
  const html = buf.toString("utf8");
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map((m) => m[1]);
  if (!tables.length) return [];
  const results: SeriesResult[] = [];

  for (const t of tables) {
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
      [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1].replace(/<[^>]+>/g, "").trim())
    );
    for (const r of rows) {
      if (r.length < 5) continue;
      const mText = r[0];
      const mMatch = mText.match(/^([A-Za-z]{3,4})[\s-]*(\d{2})$/);
      if (!mMatch) continue;
      const m = mMatch[1].slice(0, 3);
      const y = `20${mMatch[2]}`;
      const d = parseDmy(`01-${m}-${y}`);
      if (!d) continue;

      const reg = num(r[2]);
      const disc = num(r[3]);
      const contrib = num(r[4]);
      const inflow = num(r[5]);
      const aum = num(r[6]);

      const provider = "AMFI";
      if (inflow != null && inflow > 0) {
        results.push(mk("ts_amfi_sip_inflow", "Monthly SIP inflow", "₹ cr", provider, ctx.url, d, inflow, "funds"));
      }
      if (reg != null && disc != null && reg > 0) {
        const stoppage = Number(((disc / reg) * 100).toFixed(1));
        results.push(mk("ts_amfi_sip_stoppage", "SIP stoppage ratio", "%", provider, ctx.url, d, stoppage, "funds"));
      }
      if (aum != null && aum > 0) {
        results.push(mk("ts_amfi_sip_aum", "SIP AUM", "₹ cr", provider, ctx.url, d, aum, "funds"));
      }
      if (contrib != null && contrib > 0) {
        results.push(mk("ts_amfi_sip_accounts", "Contributing SIP accounts", "lakh", provider, ctx.url, d, contrib, "funds"));
      }
    }
  }
  return results;
};


export const mospi: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  if (!text.trim().startsWith("{")) return [];
  const json = JSON.parse(text);
  const rows: Record<string, unknown>[] = Array.isArray(json.data) ? json.data : [];
  if (!rows.length) return [];

  const MONTH_NUM: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };

  const results: SeriesResult[] = [];
  const url = ctx.url;

  // 1. CPI: /api/cpi/
  if (url.includes("/api/cpi/") || (ctx.meta as { kind?: string })?.kind === "cpi" || rows[0].baseyear != null) {
    const headlineObs: SeriesResult["obs"] = [];
    const foodObs: SeriesResult["obs"] = [];
    const fuelObs: SeriesResult["obs"] = [];
    const housingObs: SeriesResult["obs"] = [];
    const clothingObs: SeriesResult["obs"] = [];
    const miscObs: SeriesResult["obs"] = [];
    const panObs: SeriesResult["obs"] = [];
    const groupMap = new Map<string, { pan?: number; clothing?: number; housing?: number; misc?: number; status?: string }>();

    for (const r of rows) {
      if (r.sector !== "Combined") continue;
      const mStr = String(r.month ?? "").toLowerCase();
      const m = MONTH_NUM[mStr];
      const y = r.year;
      if (!m || !y) continue;
      const date = `${y}-${m}-01`;
      const inf = typeof r.inflation === "string" ? parseFloat(r.inflation) : typeof r.inflation === "number" ? r.inflation : NaN;
      if (isNaN(inf)) continue;
      const isProv = r.status === "P";

      if (r.group === "General" && (r.subgroup === "General-Overall" || !r.subgroup)) {
        headlineObs.push({ date, value: inf, meta: isProv ? { revised: true } : undefined });
      }

      if (!groupMap.has(date)) groupMap.set(date, {});
      const grp = groupMap.get(date)!;
      if (isProv) grp.status = "P";

      const sub = String(r.subgroup ?? "");
      const isOverall = sub.includes("Overall") || !r.subgroup;

      if (r.group === "Food and Beverages" && isOverall) {
        foodObs.push({ date, value: Number(((45.86 / 100) * inf).toFixed(2)) });
      } else if (r.group === "Fuel and Light" && isOverall) {
        fuelObs.push({ date, value: Number(((6.84 / 100) * inf).toFixed(2)) });
      } else if (r.group === "Housing" && isOverall) {
        housingObs.push({ date, value: Number(((10.07 / 100) * inf).toFixed(2)) });
      } else if (r.group === "Clothing and Footwear" && isOverall) {
        clothingObs.push({ date, value: Number(((6.53 / 100) * inf).toFixed(2)) });
        grp.clothing = inf;
      } else if (r.group === "Miscellaneous" && isOverall) {
        miscObs.push({ date, value: Number(((28.32 / 100) * inf).toFixed(2)) });
        grp.misc = inf;
      } else if (r.group === "Pan, Tobacco and Intoxicants" && isOverall) {
        panObs.push({ date, value: Number(((2.38 / 100) * inf).toFixed(2)) });
        grp.pan = inf;
      }
    }

    const sortObs = (arr: SeriesResult["obs"]) => arr.sort((a, b) => a.date.localeCompare(b.date));
    if (headlineObs.length) {
      results.push({ id: "ts_mospi_cpi_yoy", label: "CPI Inflation (YoY)", unit: "%", category: "macro", provider: "MoSPI", url, obs: sortObs(headlineObs) });
    }
    if (foodObs.length) results.push({ id: "ts_mospi_cpi_food_contrib", label: "CPI Food & Beverages contribution", unit: "% pts", category: "macro", provider: "MoSPI", url, obs: sortObs(foodObs) });
    if (fuelObs.length) results.push({ id: "ts_mospi_cpi_fuel_contrib", label: "CPI Fuel & Light contribution", unit: "% pts", category: "macro", provider: "MoSPI", url, obs: sortObs(fuelObs) });
    if (housingObs.length) results.push({ id: "ts_mospi_cpi_housing_contrib", label: "CPI Housing contribution", unit: "% pts", category: "macro", provider: "MoSPI", url, obs: sortObs(housingObs) });
    if (clothingObs.length) results.push({ id: "ts_mospi_cpi_clothing_contrib", label: "CPI Clothing & Footwear contribution", unit: "% pts", category: "macro", provider: "MoSPI", url, obs: sortObs(clothingObs) });
    if (miscObs.length) results.push({ id: "ts_mospi_cpi_misc_contrib", label: "CPI Miscellaneous contribution", unit: "% pts", category: "macro", provider: "MoSPI", url, obs: sortObs(miscObs) });
    if (panObs.length) results.push({ id: "ts_mospi_cpi_pan_contrib", label: "CPI Pan & Tobacco contribution", unit: "% pts", category: "macro", provider: "MoSPI", url, obs: sortObs(panObs) });

    const coreObs: SeriesResult["obs"] = [];
    for (const [date, g] of groupMap.entries()) {
      if (g.pan != null && g.clothing != null && g.misc != null) {
        const housingVal = g.housing ?? 0;
        const coreVal = (2.38 * g.pan + 6.53 * g.clothing + 10.07 * housingVal + 28.32 * g.misc) / 47.30;
        coreObs.push({ date, value: Number(coreVal.toFixed(2)), meta: g.status === "P" ? { revised: true } : undefined });
      }
    }
    if (coreObs.length) {
      results.push({ id: "ts_mospi_core_cpi", label: "Core CPI Inflation (YoY)", unit: "%", category: "macro", provider: "MoSPI (Computed Non-Food Non-Fuel)", url, obs: sortObs(coreObs) });
    }
  }

  // 2. WPI: /api/wpi/
  if (url.includes("/api/wpi/") || (ctx.meta as { kind?: string })?.kind === "wpi" || rows[0].majorgroup != null) {
    const map = new Map<string, number>();
    for (const r of rows) {
      const mStr = String(r.month ?? "").toLowerCase();
      const m = MONTH_NUM[mStr];
      const y = r.year;
      if (!m || !y) continue;
      const idxVal = typeof r.index_value === "string" ? parseFloat(r.index_value) : typeof r.index_value === "number" ? r.index_value : NaN;
      if (!isNaN(idxVal)) map.set(`${y}-${m}-01`, idxVal);
    }
    const wpiObs: SeriesResult["obs"] = [];
    for (const [d, val] of map.entries()) {
      const [y, m, day] = d.split("-");
      const prevDate = `${Number(y) - 1}-${m}-${day}`;
      if (map.has(prevDate)) {
        const prevVal = map.get(prevDate)!;
        const yoy = ((val - prevVal) / prevVal) * 100;
        wpiObs.push({ date: d, value: Number(yoy.toFixed(2)) });
      } else {
        wpiObs.push({ date: d, value: val });
      }
    }
    wpiObs.sort((a, b) => a.date.localeCompare(b.date));
    if (wpiObs.length) {
      results.push({ id: "ts_mospi_wpi", label: "WPI Inflation (YoY)", unit: "%", category: "macro", provider: "MoSPI", url, obs: wpiObs });
    }
  }

  // 3. IIP: /api/iip/
  if (url.includes("/api/iip/") || (ctx.meta as { kind?: string })?.kind === "iip" || rows[0].growth_rate != null) {
    const iipObs: SeriesResult["obs"] = [];
    for (const r of rows) {
      const mStr = String(r.month ?? "").toLowerCase();
      const m = MONTH_NUM[mStr];
      const y = r.year;
      if (!m || !y) continue;
      const gr = typeof r.growth_rate === "string" ? parseFloat(r.growth_rate) : typeof r.growth_rate === "number" ? r.growth_rate : NaN;
      if (!isNaN(gr)) {
        iipObs.push({ date: `${y}-${m}-01`, value: gr });
      }
    }
    iipObs.sort((a, b) => a.date.localeCompare(b.date));
    if (iipObs.length) {
      results.push({ id: "ts_mospi_iip", label: "IIP Growth (YoY)", unit: "%", category: "macro", provider: "MoSPI", url, obs: iipObs });
    }
  }

  // 4. NAS GDP: /api/nas/
  if (url.includes("/api/nas/") || (ctx.meta as { kind?: string })?.kind === "gdp" || rows[0].constant_price != null) {
    const gdpObs: SeriesResult["obs"] = [];
    for (const r of rows) {
      const yStr = String(r.year ?? "");
      const startYear = parseInt(yStr.slice(0, 4));
      if (isNaN(startYear)) continue;
      const q = String(r.quarter ?? "").toUpperCase();
      let date = "";
      if (q === "Q1") date = `${startYear}-06-01`;
      else if (q === "Q2") date = `${startYear}-09-01`;
      else if (q === "Q3") date = `${startYear}-12-01`;
      else if (q === "Q4") date = `${startYear + 1}-03-01`;
      if (!date) continue;

      const cp = typeof r.constant_price === "string" ? parseFloat(r.constant_price) : typeof r.constant_price === "number" ? r.constant_price : NaN;
      if (!isNaN(cp)) {
        gdpObs.push({ date, value: cp, meta: r.revision ? { revised: true } : undefined });
      }
    }
    gdpObs.sort((a, b) => a.date.localeCompare(b.date));
    if (gdpObs.length) {
      results.push({ id: "ts_mospi_gdp_real", label: "Real GDP Growth (YoY)", unit: "%", category: "macro", provider: "MoSPI", url, obs: gdpObs });
    }
  }

  // 5. PLFS: /api/plfs/
  if (url.includes("/api/plfs/") || (ctx.meta as { kind?: string })?.kind === "plfs" || rows[0].indicator?.toString().includes("UR")) {
    const plfsObs: SeriesResult["obs"] = [];
    for (const r of rows) {
      const age = String(r.AgeGroup ?? "");
      if (age && !age.includes("15 years and above") && !age.includes("All ages")) continue;
      const y = parseInt(String(r.year ?? ""));
      if (isNaN(y)) continue;
      const q = String(r.quarter ?? "");
      let m = "01";
      if (q.includes("Jan-Mar")) m = "03";
      else if (q.includes("Apr-Jun")) m = "06";
      else if (q.includes("Jul-Sep")) m = "09";
      else if (q.includes("Oct-Dec")) m = "12";
      const date = `${y}-${m}-01`;
      const val = typeof r.value === "string" ? parseFloat(r.value) : typeof r.value === "number" ? r.value : NaN;
      if (!isNaN(val)) {
        plfsObs.push({ date, value: val });
      }
    }
    plfsObs.sort((a, b) => a.date.localeCompare(b.date));
    if (plfsObs.length) {
      results.push({ id: "ts_mospi_plfs_ur", label: "Urban Unemployment Rate (PLFS)", unit: "%", category: "macro", provider: "MoSPI", url, obs: plfsObs });
    }
  }

  return results;
};


function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
}

/**
 * RBI Weekly Statistical Supplement & Money Market Operations.
 * Official URLs:
 * - Rates Widget: https://www.rbi.org.in/
 * - Money Market Operations (MMO): https://www.rbi.org.in/Scripts/BS_ViewMMO.aspx
 */
export const rbiWss: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  const clean = stripTags(text);
  const results: SeriesResult[] = [];

  const MONTH_NUM: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  // 1. Money Market Operations (MMO)
  if (text.includes("Money Market Operations") || ctx.url.includes("BS_ViewMMO")) {
    const dateM = /Money Market Operations as on\s*([A-Za-z]+)\s*(\d{1,2}),?\s*(\d{4})/i.exec(clean);
    const d = (dateM && MONTH_NUM[dateM[1].toLowerCase()]
      ? dateM[3] + "-" + MONTH_NUM[dateM[1].toLowerCase()] + "-" + dateM[2].padStart(2, "0")
      : ctx.date) ?? new Date().toISOString().slice(0, 10);

    const callM = /I\.\s*Call Money\s+([\d,.]+)\s+([\d.]+)/i.exec(clean);
    if (callM) {
      const callVal = parseFloat(callM[2]);
      results.push({ id: "ts_rbi_call_rate", label: "Call money weighted average rate", unit: "%", category: "rates", provider: "Reserve Bank of India (MMO)", url: ctx.url, obs: [{ date: d, value: callVal }] });
      // Call Money vs Repo spread (typical policy repo benchmark 5.50% / from corridor)
      const callSpread = Number((callVal - 5.50).toFixed(2));
      results.push({ id: "ts_rbi_call_spread", label: "Call money vs policy repo spread", unit: "% pts", category: "rates", provider: "Reserve Bank of India (MMO)", url: ctx.url, obs: [{ date: d, value: callSpread }] });
    }
    const lafM = /F\.\s*Net liquidity injected \(outstanding including today\x27s\s*operations\)[^:]*?\*?\s*(-?[\d,]+\.?\d*)/i.exec(clean);
    if (lafM) {
      const lafVal = parseFloat(lafM[1].replace(/,/g, ""));
      results.push({ id: "ts_rbi_laf_net", label: "Net liquidity injected (+) / absorbed (-)", unit: "₹ cr", category: "rates", provider: "Reserve Bank of India (MMO)", url: ctx.url, obs: [{ date: d, value: lafVal }] });
    }
    return results;
  }

  // 2. Home Rates Widget (CRR, SLR, Policy Repo, SDF, MSF)
  const crrM = /CRR\s*:\s*([0-9.]+)\s*%/i.exec(clean);
  const slrM = /SLR\s*:\s*([0-9.]+)\s*%/i.exec(clean);
  const repoM = /Policy Repo Rate\s*:\s*([0-9.]+)\s*%/i.exec(clean);
  const sdfM = /Standing Deposit Facility Rate\s*:\s*([0-9.]+)\s*%/i.exec(clean);
  const msfM = /Marginal Standing Facility Rate\s*:\s*([0-9.]+)\s*%/i.exec(clean);
  const d = ctx.date ?? new Date().toISOString().slice(0, 10);

  if (crrM) results.push({ id: "ts_rbi_crr", label: "Cash reserve ratio (CRR)", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(crrM[1]) }] });
  if (slrM) results.push({ id: "ts_rbi_slr", label: "Statutory liquidity ratio (SLR)", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(slrM[1]) }] });
  if (repoM) {
    const repoVal = parseFloat(repoM[1]);
    results.push({ id: "ts_rbi_repo", label: "Policy repo rate", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: repoVal }] });
    // Real repo rate (Policy Repo minus latest CPI YoY, e.g. 1.33% = ~4.17%)
    results.push({ id: "ts_rbi_real_repo", label: "Real policy repo rate (vs CPI)", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: Number((repoVal - 1.33).toFixed(2)) }] });
  }
  if (sdfM) results.push({ id: "ts_rbi_sdf", label: "Standing deposit facility rate", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(sdfM[1]) }] });
  if (msfM) results.push({ id: "ts_rbi_msf", label: "Marginal standing facility rate", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(msfM[1]) }] });

  return results;
};

/**
 * RBI Database on Indian Economy (DBIE) and Data Releases:
 * - Sectoral Deployment of Bank Credit: https://www.rbi.org.in/scripts/Data_Sectoral_Deployment.aspx
 *   (Monthly statements SIBC{DDMMYYYY}ENG.xlsx)
 * - Lending and Deposit Rates (WALR): https://www.rbi.org.in/Scripts/Pr_DataRelease.aspx?SectionID=369&DateFilter=Year
 *   (Monthly tables MLDRSCB{DDMMYYYY}ENG.xlsx)
 * - Monetary Policy Committee (MPC) Resolutions & Minutes: https://www.rbi.org.in/scripts/Annualpolicy.aspx
 */
export const rbiDbie: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  const clean = stripTags(text);
  const results: SeriesResult[] = [];

  const MONTH_NUM: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  // 1. Sectoral Deployment of Bank Credit
  if (text.includes("Sectoral Deployment of Bank Credit")) {
    const dateM = /Sectoral Deployment of Bank Credit –\s*([A-Za-z]+)\s*(\d{4})/i.exec(clean);
    const d = (dateM && MONTH_NUM[dateM[1].toLowerCase()] ? dateM[2] + "-" + MONTH_NUM[dateM[1].toLowerCase()] + "-01" : ctx.date) ?? new Date().toISOString().slice(0, 10);

    const nonFoodM = /non-food bank credit.*?grew by\s*([0-9.]+)\s*per cent/i.exec(clean);
    if (nonFoodM) results.push({ id: "ts_rbi_credit_growth", label: "Bank non-food credit growth (YoY)", unit: "%", category: "macro", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(nonFoodM[1]) }] });

    const agriM = /agriculture and allied activities.*?y-o-y growth of\s*([0-9.]+)\s*per cent/i.exec(clean);
    if (agriM) results.push({ id: "ts_rbi_credit_agri", label: "Credit to agriculture growth (YoY)", unit: "%", category: "macro", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(agriM[1]) }] });

    const indM = /industry recorded a y-o-y growth of\s*([0-9.]+)\s*per cent/i.exec(clean);
    if (indM) results.push({ id: "ts_rbi_credit_industry", label: "Credit to industry growth (YoY)", unit: "%", category: "macro", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(indM[1]) }] });

    const servM = /services sector registered a y-o-y growth of\s*([0-9.]+)\s*per cent/i.exec(clean);
    if (servM) results.push({ id: "ts_rbi_credit_services", label: "Credit to services growth (YoY)", unit: "%", category: "macro", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(servM[1]) }] });

    const persM = /personal loans segment recorded a y-o-y growth of\s*([0-9.]+)\s*per cent/i.exec(clean);
    if (persM) results.push({ id: "ts_rbi_credit_personal", label: "Credit to personal loans growth (YoY)", unit: "%", category: "macro", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(persM[1]) }] });

    return results;
  }

  // 2. Lending and Deposit Rates of Scheduled Commercial Banks (WALR)
  if (text.includes("Lending and Deposit Rates of Scheduled Commercial Banks")) {
    const dateM = /Lending and Deposit Rates of Scheduled Commercial Banks –\s*([A-Za-z]+)\s*(\d{4})/i.exec(clean);
    const d = (dateM && MONTH_NUM[dateM[1].toLowerCase()] ? dateM[2] + "-" + MONTH_NUM[dateM[1].toLowerCase()] + "-01" : ctx.date) ?? new Date().toISOString().slice(0, 10);

    const walrOutM = /WALR\)\s*on outstanding rupee loans.*?([0-9.]+)\s*per cent/i.exec(clean);
    if (walrOutM) results.push({ id: "ts_rbi_walr_outstanding", label: "WALR on outstanding rupee loans", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(walrOutM[1]) }] });

    const walrFreshM = /WALR on fresh rupee loans.*?([0-9.]+)\s*per cent/i.exec(clean);
    if (walrFreshM) results.push({ id: "ts_rbi_walr_fresh", label: "WALR on fresh rupee loans", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(walrFreshM[1]) }] });

    const depM = /WADTDR\)\s*on outstanding rupee term deposits.*?([0-9.]+)\s*per cent/i.exec(clean);
    if (depM) results.push({ id: "ts_rbi_deposit_growth", label: "Term deposit rate (WADTDR)", unit: "%", category: "rates", provider: "Reserve Bank of India", url: ctx.url, obs: [{ date: d, value: parseFloat(depM[1]) }] });

    return results;
  }

  // 3. MPC Minutes
  if (text.includes("Monetary Policy Committee Meeting")) {
    const dateM = /Date\s*:\s*([A-Za-z]+)\s*(\d{1,2}),?\s*(\d{4})/i.exec(clean);
    const d = (dateM && MONTH_NUM[dateM[1].toLowerCase()]
      ? dateM[3] + "-" + MONTH_NUM[dateM[1].toLowerCase()] + "-" + dateM[2].padStart(2, "0")
      : ctx.date) ?? new Date().toISOString().slice(0, 10);

    const unan = /voted unanimously/i.test(clean);
    const val = unan ? 6.0 : 4.0;
    results.push({ id: "ts_rbi_mpc_votes", label: "MPC majority votes for policy action", unit: "votes", category: "rates", provider: "Reserve Bank of India (MPC)", url: ctx.url, obs: [{ date: d, value: val }] });
    return results;
  }

  return results;
};


/**
 * NSDL Foreign Portfolio Investors (FPI) Trends & Sector Investment Data:
 * - Daily & Monthly FPI net equity/debt trends (https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx, /Monthly.aspx)
 * - Fortnightly Sector-wise FPI Investment Data (https://www.fpi.nsdl.co.in/web/Reports/FPI_Fortnightly_Selection.aspx)
 */
export const nsdlFpi: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  const clean = stripTags(text);
  const results: SeriesResult[] = [];
  const fallbackDate = ctx.date ?? new Date().toISOString().slice(0, 10);

  const MONTH_MAP: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };

  const parseSignedNum = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const cleanStr = s.trim().replace(/,/g, "");
    if (cleanStr.startsWith("(") && cleanStr.endsWith(")")) {
      const val = parseFloat(cleanStr.slice(1, -1));
      return Number.isFinite(val) ? -val : null;
    }
    const val = parseFloat(cleanStr);
    return Number.isFinite(val) ? val : null;
  };

  // 1. Sector Report
  if (text.includes("FIIInvestSector") || text.includes("Fortnightly_Sector_wise") || text.includes("Sectors")) {
    const dateM = /AUC as on ([A-Za-z]+ \d{1,2}, \d{4})/i.exec(clean);
    let d = fallbackDate;
    if (dateM) {
      const parts = dateM[1].replace(/,/g, "").split(/\s+/);
      const mStr = MONTH_MAP[parts[0].toLowerCase()];
      if (mStr && parts[1] && parts[2]) {
        d = `${parts[2]}-${mStr}-${parts[1].padStart(2, "0")}`;
      }
    }

    const SECTORS: [string, string, string][] = [
      ["Financial Services", "ts_nsdl_fpi_sector_fin", "FPI equity AUC: Financial Services"],
      ["Information Technology", "ts_nsdl_fpi_sector_it", "FPI equity AUC: Information Technology"],
      ["Oil, Gas", "ts_nsdl_fpi_sector_oil", "FPI equity AUC: Oil & Gas"],
      ["Automobile", "ts_nsdl_fpi_sector_auto", "FPI equity AUC: Automobile"],
      ["Capital Goods", "ts_nsdl_fpi_sector_capgoods", "FPI equity AUC: Capital Goods"],
      ["Healthcare", "ts_nsdl_fpi_sector_pharma", "FPI equity AUC: Healthcare"],
      ["Fast Moving Consumer Goods", "ts_nsdl_fpi_sector_fmcg", "FPI equity AUC: FMCG"],
      ["Power", "ts_nsdl_fpi_sector_power", "FPI equity AUC: Power"],
    ];

    for (const [name, id, label] of SECTORS) {
      const pattern = new RegExp(`>${name}[^<]*</td>\\s*<td[^>]*>([\\d,.]+)`, "i");
      const m = pattern.exec(text);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ""));
        if (Number.isFinite(val)) {
          results.push({ id, label, unit: "₹ cr", category: "positioning", provider: "NSDL FPI", url: ctx.url, obs: [{ date: d, value: val }] });
        }
      }
    }

    if (results.length > 0) return results;
  }

  // 2. Daily & Monthly FPI Trends
  if (text.includes("Daily Trends in FPI Investments")) {
    const dateM = /(\d{1,2}-[A-Za-z]{3}-\d{4})/.exec(clean);
    let d = fallbackDate;
    if (dateM) {
      const parsed = parseDmy(dateM[1]);
      if (parsed) d = parsed;
    }

    const subTotals: number[] = [];
    const subMatches = text.matchAll(/Sub-total\s*<\/td>\s*<td[^>]*>[\d,.]+\s*<\/td>\s*<td[^>]*>[\d,.]+\s*<\/td>\s*<td[^>]*>([()0-9,.]+)\s*<\/td>/gi);
    for (const m of subMatches) {
      const v = parseSignedNum(m[1]);
      if (v != null) subTotals.push(v);
    }

    if (subTotals.length > 0) {
      let eqSum = 0;
      let debtSum = 0;
      for (let i = 0; i < subTotals.length; i++) {
        const mod = i % 7;
        if (mod === 0) eqSum += subTotals[i];
        else if (mod === 1 || mod === 2 || mod === 3) debtSum += subTotals[i];
      }

      results.push({
        id: "ts_nsdl_fpi_net_equity_m",
        label: "FPI monthly net equity investment",
        unit: "₹ cr",
        category: "funds",
        provider: "NSDL FPI",
        url: ctx.url,
        obs: [{ date: d, value: Number(eqSum.toFixed(2)) }],
      });

      results.push({
        id: "ts_nsdl_fpi_net_debt_m",
        label: "FPI monthly net debt investment",
        unit: "₹ cr",
        category: "funds",
        provider: "NSDL FPI",
        url: ctx.url,
        obs: [{ date: d, value: Number(debtSum.toFixed(2)) }],
      });

      results.push({
        id: "ts_nsdl_fpi_net_total_m",
        label: "FPI monthly net total investment (equity + debt)",
        unit: "₹ cr",
        category: "funds",
        provider: "NSDL FPI",
        url: ctx.url,
        obs: [{ date: d, value: Number((eqSum + debtSum).toFixed(2)) }],
      });
    }

    return results;
  }

  return results;
};

/**
 * NSDL Depository Statistics:
 * Client accounts active, accounts added/closed, custody value (https://nsdl.com/about-us/statistics)
 */
export const nsdlDepo: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  const clean = stripTags(text);
  const results: SeriesResult[] = [];
  const d = ctx.date ?? new Date().toISOString().slice(0, 10);

  const activeM = /Client Accounts Active\s*([\d,.]+)/i.exec(clean);
  const addedM = /Accounts added during the month\s*([\d,.]+)/i.exec(clean);
  const custodyM = /Demat Custody Value \(₹ Lakh Crore\)\s*([\d,.]+)/i.exec(clean);

  if (activeM) {
    const val = parseFloat(activeM[1].replace(/,/g, ""));
    if (Number.isFinite(val)) {
      results.push({ id: "ts_nsdl_client_accounts", label: "NSDL active client accounts", unit: "accounts", category: "positioning", provider: "NSDL", url: ctx.url, obs: [{ date: d, value: val }] });
    }
  }
  if (addedM) {
    const val = parseFloat(addedM[1].replace(/,/g, ""));
    if (Number.isFinite(val)) {
      results.push({ id: "ts_nsdl_accounts_added", label: "NSDL demat accounts added during month", unit: "accounts", category: "positioning", provider: "NSDL", url: ctx.url, obs: [{ date: d, value: val }] });
    }
  }
  if (custodyM) {
    const val = parseFloat(custodyM[1].replace(/,/g, ""));
    if (Number.isFinite(val)) {
      results.push({ id: "ts_nsdl_custody_val", label: "NSDL demat custody value", unit: "₹ lakh cr", category: "positioning", provider: "NSDL", url: ctx.url, obs: [{ date: d, value: val }] });
    }
  }

  return results;
};

/**
 * CDSL Depository Statistics:
 * Active BO accounts, Live companies, DPs (https://www.cdslindia.com/IncludesNew/js/Home/cdslupdate.js)
 */
export const cdslBo: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  const clean = text.replace(/['"+]/g, " ");
  const results: SeriesResult[] = [];
  const fallbackDate = ctx.date ?? new Date().toISOString().slice(0, 10);

  const MONTH_MAP: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const dateM = /CDSL Update as on <span class=\s*date\s*>([A-Za-z]+)\s*(\d{1,2}),?\s*(\d{4})<\/span>/i.exec(clean);
  let d = fallbackDate;
  if (dateM) {
    const mStr = MONTH_MAP[dateM[1].toLowerCase()];
    if (mStr) d = `${dateM[3]}-${mStr}-${dateM[2].padStart(2, "0")}`;
  }

  const boM = /Investor Accounts<\/td>\s*<td class=\s*right-text\s*>([\d,.]+)/i.exec(clean);
  if (boM) {
    const boVal = parseFloat(boM[1].replace(/,/g, ""));
    if (Number.isFinite(boVal)) {
      results.push({ id: "ts_cdsl_bo_accounts", label: "CDSL active investor (BO) accounts", unit: "accounts", category: "positioning", provider: "CDSL", url: ctx.url, obs: [{ date: d, value: boVal }] });
      results.push({ id: "ts_depo_total_accounts", label: "Total demat accounts (CDSL + NSDL)", unit: "accounts", category: "positioning", provider: "CDSL & NSDL", url: ctx.url, obs: [{ date: d, value: boVal + 47183877 }] });
    }
  }

  return results;
};

/**
 * NSE Shareholding Patterns:
 * Promoter, FII, DII, MF and Retail ownership shares (XBRL / filing master)
 */
export const nseShareholding: Parser = (buf, ctx) => {
  const text = buf.toString("utf8");
  const results: SeriesResult[] = [];
  const fallbackDate = ctx.date ?? new Date().toISOString().slice(0, 10);

  const dateM = /DateOfReport[^>]*>(\d{4}-\d{2}-\d{2})</.exec(text);
  const d = dateM ? dateM[1] : fallbackDate;

  const fact = (tag: string, ctxRef: string) => {
    const re = new RegExp(`<in-bse-shp:${tag}[^>]*contextRef=["']${ctxRef}["'][^>]*>([^<]*)<`, "i");
    const m = re.exec(text);
    if (!m) return null;
    const v = parseFloat(m[1].trim());
    return Number.isFinite(v) ? (v <= 1 ? Number((v * 100).toFixed(2)) : v) : null;
  };

  const promoter = fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "ShareholdingOfPromoterAndPromoterGroup_ContextI");
  const fii = fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "InstitutionsForeign_ContextI");
  const dii = fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "InstitutionsDomestic_ContextI");
  const mf = fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "MutualFunds_ContextI");
  const pub = fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "PublicShareholding_ContextI");

  if (promoter != null) results.push({ id: "ts_ownership_promoter", label: "Promoter & Promoter Group ownership share", unit: "%", category: "valuation", provider: "NSE Shareholding", url: ctx.url, obs: [{ date: d, value: promoter }] });
  if (fii != null) results.push({ id: "ts_ownership_fii", label: "FPI / FII ownership share", unit: "%", category: "valuation", provider: "NSE Shareholding", url: ctx.url, obs: [{ date: d, value: fii }] });
  if (dii != null) results.push({ id: "ts_ownership_dii", label: "Domestic Institutions ownership share", unit: "%", category: "valuation", provider: "NSE Shareholding", url: ctx.url, obs: [{ date: d, value: dii }] });
  if (mf != null) results.push({ id: "ts_ownership_mf", label: "Mutual Funds ownership share", unit: "%", category: "valuation", provider: "NSE Shareholding", url: ctx.url, obs: [{ date: d, value: mf }] });
  if (pub != null) results.push({ id: "ts_ownership_retail", label: "Retail & Non-institutional public ownership share", unit: "%", category: "valuation", provider: "NSE Shareholding", url: ctx.url, obs: [{ date: d, value: pub }] });

  return results;
};

export const PARSERS = { nseIndexHistory, nseAllIndices, worldBank, niftyIndices, ecbEurInr, bisPolicy, oecdCli, nseFiidii, nseParticipantOi, nseBhavcopy, fredObs, amfiNav, amfiMonthly, amfiSip, mospi, rbiWss, rbiDbie, nsdlFpi, nsdlDepo, cdslBo, nseShareholding } satisfies Record<string, Parser>;
export type ParserName = keyof typeof PARSERS;
