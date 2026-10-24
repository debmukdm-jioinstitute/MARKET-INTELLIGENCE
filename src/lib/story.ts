import { formatPct } from "@/lib/format";

/** Plain-English narration of live numbers (tipsheet-style). All changes are fractions: 0.012 = +1.2%. */
export type Mover = { name: string; changePct: number | null | undefined };

/** Runtime guard: API fields can arrive as strings/NaN despite the types. */
const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const num = (n: number) => n.toLocaleString("en-IN");
const valid = (rows: Mover[]) => rows.filter((r): r is { name: string; changePct: number } => ok(r.changePct));

export function moved(f: number | null | undefined, digits = 1): string {
  if (!ok(f)) return "";
  if (Math.abs(f) < 0.0005) return "was flat";
  return `${f > 0 ? "rose" : "fell"} ${formatPct(Math.abs(f), digits, false)}`;
}

/** "The Nifty 50 fell 0.4%; Smallcap 250 fell 2.8%, the weakest of 12 indices". */
export function indexHeadline(rows: Mover[], benchmark = /^nifty 50$/i): string | null {
  const v = valid(rows);
  if (!v.length) return null;
  const bench = v.find((r) => benchmark.test(r.name.trim())) ?? v[0];
  const rest = v.filter((r) => r !== bench);
  const up = bench.changePct > 0;
  const extreme = rest.sort((a, b) => (up ? b.changePct - a.changePct : a.changePct - b.changePct))[0];
  const caps = bench.name === bench.name.toUpperCase();
  const lead = `${caps || /^the /i.test(bench.name) ? "" : "The "}${bench.name} ${moved(bench.changePct)}`;
  if (!extreme || Math.sign(extreme.changePct) !== Math.sign(bench.changePct) || Math.abs(extreme.changePct) <= Math.abs(bench.changePct)) return lead;
  return `${lead}; ${extreme.name} ${moved(extreme.changePct)}`;
}

export function indexDeck(rows: Mover[]): string | null {
  const v = valid(rows).sort((a, b) => b.changePct - a.changePct);
  if (v.length < 2) return null;
  const risen = v.filter((r) => r.changePct > 0).length;
  const best = v[0];
  const worst = v[v.length - 1];
  return `${risen === 0 ? "None" : risen} of ${v.length} ${risen === 0 ? "rose" : "indices rose"}. Strongest: ${best.name} (${formatPct(best.changePct)}); weakest: ${worst.name} (${formatPct(worst.changePct)}).`;
}

export function breadthHeadline(adv: number | null | undefined, dec: number | null | undefined): string | null {
  if (!ok(adv) || !ok(dec) || adv + dec === 0) return null;
  const ratio = adv / Math.max(dec, 1);
  const lead = ratio >= 2 ? "Buying was broad" : ratio <= 0.5 ? "Selling was broad" : "The market was split";
  return `${lead}: ${num(adv)} stocks rose and ${num(dec)} fell`;
}

export function breadthDeck(adv: number | null | undefined, dec: number | null | undefined, unch?: number | null, hi?: number | null, lo?: number | null): string | null {
  if (!ok(adv) || !ok(dec)) return null;
  const total = adv + dec + (ok(unch) ? unch : 0);
  if (!total) return null;
  const parts = [`${Math.round((adv / total) * 100)}% of ${num(total)} stocks advanced.`];
  if (ok(hi) && ok(lo)) parts.push(`${num(hi)} touched a 52-week high and ${num(lo)} a 52-week low${lo > hi * 3 ? ", lows far outnumbering highs" : hi > lo * 3 ? ", highs far outnumbering lows" : ""}.`);
  return parts.join(" ");
}

/** Strongest and weakest of any labelled changes, e.g. sectors or commodities. */
export function rankDeck(rows: Mover[], noun: string): string | null {
  const v = valid(rows).sort((a, b) => b.changePct - a.changePct);
  if (v.length < 2) return null;
  const risen = v.filter((r) => r.changePct > 0).length;
  return `${risen} of ${v.length} ${noun} rose. ${v[0].name} led (${formatPct(v[0].changePct)}); ${v[v.length - 1].name} trailed (${formatPct(v[v.length - 1].changePct)}).`;
}

const crore = (n: number) => `₹${num(Math.round(Math.abs(n)))} cr`;

/** Net institutional flows, ₹ crore: "Domestic institutions bought ₹3,235 cr while foreign investors bought ₹888 cr". */
export function flowHeadline(fii: number | null | undefined, dii: number | null | undefined): string | null {
  if (!ok(fii) || !ok(dii)) return null;
  const verb = (n: number) => (n >= 0 ? "bought" : "sold");
  const big = Math.abs(dii) >= Math.abs(fii);
  const [a, an, b, bn] = big ? ["Domestic institutions", dii, "foreign investors", fii] : ["Foreign investors", fii, "domestic institutions", dii];
  return `${a} ${verb(an)} ${crore(an)} ${Math.sign(an) === Math.sign(bn) ? "and" : "while"} ${b} ${verb(bn)} ${crore(bn)}`;
}

export type MacroRead = { indicator: string; current: number | null; previous: number | null; unit: string };

/** "CPI Inflation rose to 4.82% y/y from 4.45%; RBI Policy Repo Rate fell to 5.25% from 5.5%." */
export function macroDeck(rows: MacroRead[], max = 3): string | null {
  const shown = (v: number, unit: string) => `${v}${/^%/.test(unit) ? unit : ""}`;
  const parts = rows
    .filter((r) => ok(r.current) && ok(r.previous) && r.current !== r.previous)
    .slice(0, max)
    .map((r) => `${r.indicator} ${r.current! > r.previous! ? "rose" : "fell"} to ${shown(r.current!, r.unit)} from ${r.previous}${/^%/.test(r.unit) ? "%" : ""}`);
  return parts.length ? `${parts.join("; ")}.` : null;
}

/** Put-call ratio read: above 1 means more puts than calls are open. Descriptive, not a signal. */
export function pcrHeadline(name: string, pcr: number | null | undefined, maxPain?: number | null): string | null {
  if (!ok(pcr)) return null;
  const lean = pcr > 1.2 ? "puts clearly outnumber calls" : pcr < 0.7 ? "calls clearly outnumber puts" : pcr > 1 ? "puts slightly outnumber calls" : "calls slightly outnumber puts";
  return `${name} put-call ratio is ${pcr.toFixed(2)}: ${lean}${ok(maxPain) && maxPain > 0 ? `; max pain is ${num(maxPain)}` : ""}`;
}

type Flow = { today: number | null; m1: number | null; ytd: number | null };

/** "Over the past month foreign investors net sold ₹X cr and domestic institutions net bought ₹Y cr; year to date, ..." */
export function flowPeriodDeck(fii: Flow, dii: Flow): string | null {
  const side = (n: number) => (n >= 0 ? "net bought" : "net sold");
  const span = (key: "m1" | "ytd", lead: string) =>
    ok(fii[key]) && ok(dii[key])
      ? `${lead} foreign investors ${side(fii[key]!)} ${crore(fii[key]!)} and domestic institutions ${side(dii[key]!)} ${crore(dii[key]!)}`
      : null;
  const parts = [span("m1", "Over the past month"), span("ytd", "year to date,")].filter(Boolean);
  const text = parts.join("; ");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}.` : null;
}

export type YieldRead = { tenor: string; value: number | null };

/** "India's 10-year yield is 6.52% against 4.12% in the US, a gap of 2.40 points". */
export function yieldHeadline(india: YieldRead[], us: YieldRead[], tenor = "10Y"): string | null {
  const i = india.find((p) => p.tenor === tenor)?.value;
  const u = us.find((p) => p.tenor === tenor)?.value;
  if (!ok(i) || !ok(u)) return null;
  const gap = i - u;
  return `India's ${tenor.replace("Y", "-year")} yield is ${i.toFixed(2)}% against ${u.toFixed(2)}% in the US, ${gap >= 0 ? `a gap of ${gap.toFixed(2)} points` : `${Math.abs(gap).toFixed(2)} points below it`}`;
}

/** US curve shape from its 10Y and 2Y: inverted means short rates exceed long rates. */
export function curveDeck(us: YieldRead[]): string | null {
  const ten = us.find((p) => p.tenor === "10Y")?.value;
  const two = us.find((p) => p.tenor === "2Y")?.value;
  if (!ok(ten) || !ok(two)) return null;
  const slope = ten - two;
  return `The US curve is ${slope < 0 ? "inverted" : slope < 0.25 ? "flat" : "upward-sloping"}: the 10-year is ${Math.abs(slope).toFixed(2)} points ${slope < 0 ? "below" : "above"} the 2-year.`;
}

export function rbiHeadline(repo: string | null | undefined, liquidity: string | null | undefined): string | null {
  if (!repo) return null;
  return `The RBI's repo rate is ${repo}${liquidity ? `; system liquidity is ${liquidity}` : ""}`;
}

/** "Standing deposit facility 5.25%, marginal standing facility 5.75%, CRR 3.00%." Missing rates are left out, not shown as dashes. */
export function corridorDeck(c: { sdf?: string | null; msf?: string | null; crr?: string | null } | null | undefined): string | null {
  const parts = [["Standing deposit facility", c?.sdf], ["marginal standing facility", c?.msf], ["CRR", c?.crr]].filter((p): p is [string, string] => Boolean(p[1]));
  return parts.length ? `${parts.map(([k, v]) => `${k} ${v}`).join(", ")}.` : null;
}
