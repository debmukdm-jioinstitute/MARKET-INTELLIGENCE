import { createHash } from "node:crypto";

/**
 * One place that defines every event table a collector may write to: row shape,
 * validation, conflict handling. The generic saver (records.ts) turns a spec
 * into a single `jsonb_to_recordset` upsert, so a new win only adds a spec here
 * plus its CREATE TABLE in db.ts.
 *
 * Honesty rules: rows missing a required field are DROPPED, never repaired;
 * values of the wrong type become null (or drop the row if required).
 */

export type Kind = "text" | "num" | "date" | "ts" | "int" | "bool" | "textarr" | "json";
export type Col = { f: string; k: Kind; req?: boolean };
export type TableSpec = {
  name: string;
  cols: Col[];
  /** snake_case columns of the unique index used for ON CONFLICT. */
  conflict: string[];
  /** "nothing" keeps the first row (append-only / immutable facts); "update" refreshes provided (non-null) columns. */
  onConflict: "nothing" | "update";
  /** Post-clean hook: recompute derived/untrusted fields; return null to drop the row. */
  normalize?: (row: Record<string, unknown>) => Record<string, unknown> | null;
};

export const PG_TYPE: Record<Kind, string> = { text: "text", num: "numeric", date: "date", ts: "timestamptz", int: "bigint", bool: "boolean", textarr: "text[]", json: "jsonb" };
export const snake = (f: string) => f.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

function cleanValue(k: Kind, v: unknown): unknown {
  switch (k) {
    case "text":
      return str(v);
    case "num":
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    case "int":
      return typeof v === "number" && Number.isInteger(v) ? v : null;
    case "bool":
      return typeof v === "boolean" ? v : null;
    case "date": {
      const s = str(v);
      return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : null;
    }
    case "ts": {
      const s = str(v);
      return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null;
    }
    case "textarr":
      return Array.isArray(v) ? v.map(str).filter((x): x is string => x !== null) : null;
    case "json":
      return v !== null && typeof v === "object" ? v : null;
  }
}

export function cleanRow(spec: TableSpec, raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const c of spec.cols) {
    const v = cleanValue(c.k, r[c.f]);
    if (v === null && c.req) return null;
    out[c.f] = v;
  }
  return spec.normalize ? spec.normalize(out) : out;
}

/** Normalised headline: lowercase, punctuation/whitespace collapsed — so cosmetic re-filings dedup. */
export const normalizeHeadline = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** SHA-256 of symbol + calendar day + normalised headline. */
export const announcementHash = (symbol: string, headline: string, broadcastIso: string) =>
  createHash("sha256").update(`${symbol.toUpperCase()}|${broadcastIso.slice(0, 10)}|${normalizeHeadline(headline)}`).digest("hex");

export const TABLES: TableSpec[] = [
  {
    name: "broker_calls",
    conflict: ["source_url"],
    onConflict: "nothing",
    cols: [
      { f: "symbol", k: "text" },
      { f: "company", k: "text", req: true },
      { f: "broker", k: "text", req: true },
      { f: "action", k: "text", req: true },
      { f: "targetPrice", k: "num" },
      { f: "reportDate", k: "date", req: true },
      { f: "tone", k: "text" },
      { f: "toneScore", k: "num" },
      { f: "sourceUrl", k: "text", req: true },
    ],
    normalize: (r) => {
      const tone = r.tone === "positive" || r.tone === "negative" || r.tone === "neutral" ? r.tone : null;
      const score = typeof r.toneScore === "number" && r.toneScore >= 0 && r.toneScore <= 1 ? r.toneScore : null;
      return {
        ...r,
        symbol: typeof r.symbol === "string" ? r.symbol.toUpperCase() : null,
        targetPrice: typeof r.targetPrice === "number" && r.targetPrice > 0 ? r.targetPrice : null,
        tone,
        toneScore: tone ? score : null,
      };
    },
  },
  {
    name: "company_announcements",
    conflict: ["content_hash"],
    onConflict: "nothing",
    cols: [
      { f: "symbol", k: "text", req: true },
      { f: "headline", k: "text", req: true },
      { f: "category", k: "text", req: true },
      { f: "taxonomyLabels", k: "textarr" },
      { f: "broadcastDate", k: "ts", req: true },
      { f: "attachmentUrl", k: "text" },
      { f: "contentHash", k: "text" },
    ],
    // Hash is recomputed so a malformed/forged client hash can never poison dedup.
    normalize: (r) => {
      const symbol = String(r.symbol).toUpperCase();
      return { ...r, symbol, contentHash: announcementHash(symbol, String(r.headline), String(r.broadcastDate)) };
    },
  },
  {
    name: "shareholding",
    conflict: ["symbol", "broadcast_date"],
    onConflict: "update", // a later XBRL pass fills pledge/FII/DII on rows first seen from the master list
    cols: [
      { f: "symbol", k: "text", req: true },
      { f: "broadcastDate", k: "date", req: true },
      { f: "quarterEnd", k: "date" },
      { f: "promoterPct", k: "num" },
      { f: "fiiPct", k: "num" },
      { f: "diiPct", k: "num" },
      { f: "publicPct", k: "num" },
      { f: "pledgePct", k: "num" },
      { f: "shareholderCount", k: "int" },
      { f: "xbrlUrl", k: "text" },
    ],
    normalize: (r) => {
      const pct = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 100 ? v : null);
      return { ...r, symbol: String(r.symbol).toUpperCase(), promoterPct: pct(r.promoterPct), fiiPct: pct(r.fiiPct), diiPct: pct(r.diiPct), publicPct: pct(r.publicPct), pledgePct: pct(r.pledgePct) };
    },
  },
  {
    name: "credit_ratings",
    conflict: ["symbol", "agency", "action_date"],
    onConflict: "update",
    cols: [
      { f: "symbol", k: "text", req: true },
      { f: "agency", k: "text", req: true },
      { f: "rating", k: "text" },
      { f: "notch", k: "text" },
      { f: "outlook", k: "text" },
      { f: "watch", k: "text" },
      { f: "action", k: "text" },
      { f: "actionDate", k: "date", req: true },
      { f: "rationaleUrl", k: "text" }, // link only — rationale text is never stored
      { f: "source", k: "text" },
    ],
    normalize: (r) => ({ ...r, symbol: String(r.symbol).toUpperCase() }),
  },
  {
    name: "concall_summaries",
    conflict: ["content_hash"],
    onConflict: "nothing",
    cols: [
      { f: "symbol", k: "text", req: true },
      { f: "quarter", k: "text" },
      { f: "transcriptDate", k: "date", req: true },
      { f: "guidance", k: "textarr" },
      { f: "growthDrivers", k: "textarr" },
      { f: "risks", k: "textarr" },
      { f: "qaThemes", k: "textarr" },
      { f: "tonePrepared", k: "num" },
      { f: "toneQa", k: "num" },
      { f: "toneDelta", k: "num" },
      { f: "sourceUrl", k: "text", req: true },
      { f: "contentHash", k: "text", req: true },
      { f: "generatedBy", k: "text" },
    ],
    normalize: (r) => {
      const tone = (v: unknown) => (typeof v === "number" && v >= -1 && v <= 1 ? v : null);
      const tp = tone(r.tonePrepared);
      const tq = tone(r.toneQa);
      return { ...r, symbol: String(r.symbol).toUpperCase(), tonePrepared: tp, toneQa: tq, toneDelta: tp !== null && tq !== null ? Math.round((tq - tp) * 1000) / 1000 : null };
    },
  },
];

export const tableSpec = (name: unknown): TableSpec | undefined => TABLES.find((t) => t.name === name);
