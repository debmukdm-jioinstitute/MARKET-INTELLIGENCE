import { LAYOUT_LINES, type Layout, type LineDef } from "./lines";

/**
 * Reader for the exchange "financial results" XBRL (NSE / BSE Ind-AS and
 * Banking taxonomies, legacy `in-bse-fin` and 2025+ `in-capmkt` prefixes).
 * No XML library: the files are flat `<prefix:Tag contextRef=...>value</...>`
 * facts plus a context table. Pure and unit-tested.
 *
 * Honesty rules:
 *  - only contexts WITHOUT a scenario/dimension are read (segment and
 *    note-level breakdowns are ignored, so a total is always the entity total);
 *  - a (tag, context) that appears twice with different values is dropped, not
 *    guessed (the filing reuses CashAndCashEquivalentsCashFlowStatement for both
 *    opening and closing cash);
 *  - placeholder balance sheets / cash flows (all zero) are discarded.
 */

export type PeriodKind = "quarter" | "ytd" | "annual";
export type Basis = "consolidated" | "standalone";
export type Values = Record<string, number>;

export type ParsedPeriod = {
  start: string;
  end: string;
  kind: PeriodKind;
  pl: Values;
  bs: Values | null;
  cf: Values | null;
};

export type ParsedResults = {
  layout: Layout;
  basis: Basis;
  audited: boolean | null;
  periods: ParsedPeriod[];
};

const DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function periodKind(start: string, end: string): PeriodKind {
  const days = Math.round((day(end) - day(start)) / DAY) + 1;
  if (days <= 100) return "quarter";
  if (days >= 340) return "annual";
  return "ytd";
}

type Ctx = { start?: string; end?: string; instant?: string };

function readContexts(xml: string): Map<string, Ctx> {
  const out = new Map<string, Ctx>();
  for (const m of xml.matchAll(/<(?:xbrli:)?context\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/(?:xbrli:)?context>/g)) {
    const body = m[2];
    if (/<(?:xbrli:)?scenario|explicitMember|typedMember/.test(body)) continue; // dimensional → not an entity total
    const instant = /<(?:xbrli:)?instant>\s*([^<\s]+)\s*</.exec(body)?.[1];
    const start = /<(?:xbrli:)?startDate>\s*([^<\s]+)\s*</.exec(body)?.[1];
    const end = /<(?:xbrli:)?endDate>\s*([^<\s]+)\s*</.exec(body)?.[1];
    if (instant && ISO.test(instant)) out.set(m[1], { instant });
    else if (start && end && ISO.test(start) && ISO.test(end)) out.set(m[1], { start, end });
  }
  return out;
}

type Fact = { value: number } | "ambiguous";

const round2 = (n: number) => Math.round(n * 100) / 100;

function scale(def: LineDef, raw: number): number {
  return def.unit === "ps" ? round2(raw) : round2(raw / 1e7); // absolute INR → INR crore
}

const textFact = (xml: string, name: string): string | null =>
  new RegExp(`<in-[a-z0-9-]+:${name}\\s[^>]*>([^<]*)<`).exec(xml)?.[1]?.trim() ?? null;

export function parseResultsXbrl(xml: string): ParsedResults | null {
  const ctxs = readContexts(xml);
  if (!ctxs.size) return null;

  // (tag|context) → numeric fact. Non-numeric facts are simply not matched into the number table.
  const facts = new Map<string, Fact>();
  for (const m of xml.matchAll(/<in-[a-z0-9-]+:([A-Za-z0-9_]+)\s([^>]*?)>([^<]*)<\/in-[a-z0-9-]+:\1>/g)) {
    const ctx = /contextRef="([^"]+)"/.exec(m[2])?.[1];
    if (!ctx || !ctxs.has(ctx)) continue;
    if (/xsi:nil="true"/.test(m[2])) continue;
    const txt = m[3].trim();
    if (!txt || !/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(txt)) continue;
    const key = `${m[1]}|${ctx}`;
    const value = Number(txt);
    const prev = facts.get(key);
    if (prev === undefined) facts.set(key, { value });
    else if (prev === "ambiguous" || prev.value !== value) facts.set(key, "ambiguous");
  }

  const hasTag = (tag: string) => [...ctxs.keys()].some((c) => facts.has(`${tag}|${c}`));
  const layout: Layout = hasTag("InterestEarned") || (hasTag("Deposits") && hasTag("Advances")) ? "bank" : "general";
  const lines = LAYOUT_LINES[layout];

  const read = (defs: LineDef[], ctxId: string): Values => {
    const out: Values = {};
    for (const d of defs) {
      const f = facts.get(`${d.tag}|${ctxId}`);
      if (!f || f === "ambiguous") continue;
      let v = scale(d, f.value);
      if (d.flow === "out") v = -Math.abs(v);
      else if (d.flow === "in") v = Math.abs(v);
      out[d.tag] = v;
    }
    return out;
  };

  // Group duration contexts by (start,end); several ids may point at the same period.
  const byPeriod = new Map<string, { start: string; end: string; ids: string[] }>();
  const instants = new Map<string, string[]>();
  for (const [id, c] of ctxs) {
    if (c.instant) instants.set(c.instant, [...(instants.get(c.instant) ?? []), id]);
    else if (c.start && c.end) {
      const k = `${c.start}|${c.end}`;
      const g = byPeriod.get(k) ?? { start: c.start, end: c.end, ids: [] };
      g.ids.push(id);
      byPeriod.set(k, g);
    }
  }

  const revenueTags = layout === "bank" ? ["InterestEarned", "Income"] : ["RevenueFromOperations", "Income"];
  const periods: ParsedPeriod[] = [];
  for (const g of byPeriod.values()) {
    const pl: Values = {};
    const cf: Values = {};
    for (const id of g.ids) {
      Object.assign(pl, read(lines.pl, id));
      Object.assign(cf, read(lines.cf, id));
    }
    if (!revenueTags.some((t) => pl[t] !== undefined)) continue; // not an income-statement period
    const cfOk = lines.cf.length > 0 && cf.CashFlowsFromUsedInOperatingActivities !== undefined && [cf.CashFlowsFromUsedInOperatingActivities, cf.CashFlowsFromUsedInInvestingActivities, cf.CashFlowsFromUsedInFinancingActivities].some((v) => v !== undefined && v !== 0);
    periods.push({ start: g.start, end: g.end, kind: periodKind(g.start, g.end), pl, bs: null, cf: cfOk ? cf : null });
  }
  if (!periods.length) return null;

  // Balance sheet belongs to the LONGEST period ending on that instant (the quarter row stays P&L-only).
  for (const [instant, ids] of instants) {
    const bs: Values = {};
    for (const id of ids) Object.assign(bs, read(lines.bs, id));
    const total = bs.Assets ?? bs.EquityAndLiabilities ?? bs.CapitalAndLiabilities;
    if (!total || total <= 0) continue; // placeholder / absent balance sheet
    const ending = periods.filter((p) => p.end === instant).sort((a, b) => day(a.start) - day(b.start));
    if (ending[0]) ending[0].bs = bs;
  }

  const nature = textFact(xml, "NatureOfReportStandaloneConsolidated")?.toLowerCase() ?? "";
  const basis: Basis = nature.startsWith("consolidated") ? "consolidated" : "standalone";
  const aud = textFact(xml, "WhetherResultsAreAuditedOrUnaudited")?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const audited = aud === "audited" ? true : aud === "unaudited" ? false : null;

  periods.sort((a, b) => (a.end === b.end ? day(a.start) - day(b.start) : day(a.end) - day(b.end)));
  return { layout, basis, audited, periods };
}
