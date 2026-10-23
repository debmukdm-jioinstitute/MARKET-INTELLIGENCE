import { unzipSync } from "fflate";
import type { SeriesResult } from "@/lib/collector/types";
import { parseDmy } from "./dates";

export type ParseCtx = { date?: string; url: string };
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

export const PARSERS = { nseFiidii, nseParticipantOi, nseBhavcopy, fredObs } satisfies Record<string, Parser>;
export type ParserName = keyof typeof PARSERS;
