import { feedFetch } from "@/lib/feeds/http";
import { readXlsx } from "../xlsx";
import type { Collector, Obs, SeriesResult } from "../types";

/**
 * FBIL (Financial Benchmarks India) — keyless, unauthenticated JSON + one xlsx download.
 *
 *  - `/wasdm/<product>/fetch?authenticated=false` → latest ~2 days of rows (date / tenor / rate).
 *  - `/wasdm/ovnmibor/fetchgraphdata/3M`, `/wasdm/tbill/fetchcommongraph/3M` → 3-month history (backfill).
 *  - `/wasdm/gsec/fetch` lists published dates; `/wasdm/gsec/downloadPublished?date=` is the daily
 *    "GSec Prices/Yields" workbook whose "Par Yield" sheet carries the par-yield curve by tenor.
 *
 * Each (product, tenor) becomes one series: `fbil_<product>_<tenor>`. A product that fails is skipped
 * (and logged); the collector only throws — i.e. records a failure — when nothing at all came back.
 * MIFOR is deliberately not collected: FBIL's feed stopped in June 2023, so it would only ever be stale.
 *
 * Env: FBIL_GSEC_DAYS (default 1) — how many latest G-Sec workbooks to download (one-time backfill).
 */

const BASE = "https://www.fbil.org.in/wasdm";
const SITE = "https://www.fbil.org.in/";
const PROVIDER = "FBIL (Financial Benchmarks India)";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getJson<T>(path: string): Promise<T> {
  const res = await feedFetch(`${BASE}${path}`, { timeoutMs: 25_000, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`FBIL ${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** "7 Days"→7d, "1 Month"→1m, "14 DAYS"→14d, "O/N"→on, "5Y"→5y, "12 Months"→12m. */
export function tenorSlug(t: string): string {
  const s = t.trim().toLowerCase();
  if (s === "o/n" || s === "on" || s === "overnight") return "on";
  const m = /^(\d+)\s*(d|day|days|m|month|months|y|year|years)$/.exec(s);
  if (m) return `${m[1]}${m[2]![0]}`;
  return s.replace(/[^a-z0-9]+/g, "");
}

const isoDay = (s: unknown): string | null => {
  const m = typeof s === "string" ? /^(\d{4}-\d{2}-\d{2})/.exec(s) : null;
  return m ? m[1]! : null;
};
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

type Row = { processRunDate?: string; tenor?: string; tenorName?: string; subProdName?: string; rate?: number | string | null };

function addObs(map: Map<string, Obs[]>, id: string, date: string | null, value: number | null) {
  if (!date || value === null) return;
  const list = map.get(id) ?? [];
  list.push({ date, value });
  map.set(id, list);
}

function toSeries(map: Map<string, Obs[]>, meta: (id: string) => { label: string; unit: string; link: string }): SeriesResult[] {
  return [...map.entries()]
    .filter(([, obs]) => obs.length > 0)
    .map(([id, obs]) => {
      const byDate = new Map(obs.map((o) => [o.date, o]));
      const m = meta(id);
      return {
        id,
        label: m.label,
        unit: m.unit,
        category: "rates" as const,
        provider: PROVIDER,
        url: m.link,
        obs: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
}

const PRODUCTS: { key: string; label: string; unit: string; page: string; field: "tenor" | "tenorName" }[] = [
  { key: "tbill", label: "T-Bill yield", unit: "%", page: "tbill", field: "tenorName" },
  { key: "tmibor", label: "Term MIBOR", unit: "%", page: "termmibor", field: "tenor" },
  { key: "ois", label: "MIBOR-OIS", unit: "%", page: "ois", field: "tenorName" },
  { key: "cd", label: "Certificate of Deposit rate", unit: "%", page: "cd", field: "tenorName" },
  { key: "fwdprem", label: "USD/INR forward premia", unit: "% p.a.", page: "fc", field: "tenorName" },
  { key: "mror", label: "MROR (market repo overnight rate)", unit: "%", page: "mror", field: "tenor" },
  { key: "sorr", label: "SORR (secured overnight rupee rate)", unit: "%", page: "sorr", field: "tenor" },
];
const ENDPOINT: Record<string, string> = { tbill: "tbill", tmibor: "termmibor", ois: "miborois", cd: "cd", fwdprem: "fwdpremia", mror: "mror", sorr: "sorr" };

const REF_CCY: Record<string, { id: string; unit: string }> = {
  USD: { id: "fbil_ref_usd", unit: "₹ per 1 USD" },
  EUR: { id: "fbil_ref_eur", unit: "₹ per 1 EUR" },
  GBP: { id: "fbil_ref_gbp", unit: "₹ per 1 GBP" },
  JPY: { id: "fbil_ref_jpy", unit: "₹ per 100 JPY" },
};

async function referenceRates(map: Map<string, Obs[]>) {
  const rows = await getJson<Row[]>("/refrates/fetch?authenticated=false");
  for (const r of rows) {
    const m = /(\d+)\s+([A-Z]{3})\s*$/.exec(r.subProdName ?? "");
    const ccy = m ? REF_CCY[m[2]!] : undefined;
    if (!ccy) continue;
    if (m![2] === "JPY" && m![1] !== "100") continue; // keep the unit label honest
    addObs(map, ccy.id, isoDay(r.processRunDate), num(r.rate));
  }
}

async function simpleProduct(map: Map<string, Obs[]>, p: (typeof PRODUCTS)[number]) {
  const rows = await getJson<Row[]>(`/${ENDPOINT[p.key]}/fetch?authenticated=false`);
  for (const r of rows) {
    const tenor = r[p.field] ?? r.tenor ?? r.tenorName;
    if (!tenor) continue;
    // MROR/SORR are overnight rates; "3D" vs "1D" only reflects weekends, so they are one series each.
    if (p.key === "mror" || p.key === "sorr") {
      addObs(map, `fbil_${p.key}`, isoDay(r.processRunDate), num(r.rate));
      continue;
    }
    const slug = tenorSlug(tenor);
    if (!/^(on|\d+[dmy])$/.test(slug)) continue; // drop "spot" / forward-business-date buckets
    addObs(map, `fbil_${p.key}_${slug}`, isoDay(r.processRunDate), num(r.rate));
  }
}

async function overnightMiborHistory(map: Map<string, Obs[]>) {
  const j = await getJson<{ benchMarkTrend?: { publishDate?: string; rate?: number }[] }>("/ovnmibor/fetchgraphdata/3M");
  for (const t of j.benchMarkTrend ?? []) addObs(map, "fbil_mibor_on", isoDay(t.publishDate), num(t.rate));
}

async function tbillHistory(map: Map<string, Obs[]>) {
  const j = await getJson<{ benchMarkTrendData?: { productName?: string; benchMarkTrend?: { publishDate?: string; rate?: number }[] }[] }>("/tbill/fetchcommongraph/3M");
  for (const p of j.benchMarkTrendData ?? []) {
    const t = / - (.+)$/.exec(p.productName ?? "")?.[1];
    if (!t) continue;
    for (const o of p.benchMarkTrend ?? []) addObs(map, `fbil_tbill_${tenorSlug(t)}`, isoDay(o.publishDate), num(o.rate));
  }
}

const PAR_TENORS = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 30];
const parLabel = (t: number) => (t < 1 ? `${Math.round(t * 12)}m` : `${t}y`);
const MON: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** Parse the "Par Yield" sheet of one FBIL G-Sec workbook. Throws if the layout is not what we expect. */
export function parseParYield(buf: Uint8Array, expectDate: string): { date: string; curve: { tenor: number; ytm: number }[] } {
  const sheet = readXlsx(buf).sheets.find((s) => /par\s*yield/i.test(s.name));
  if (!sheet) throw new Error("FBIL G-Sec workbook has no 'Par Yield' sheet (layout changed)");
  let date: string | null = null;
  const curve: { tenor: number; ytm: number }[] = [];
  for (const [, cells] of sheet.rows) {
    for (const v of cells.values()) {
      const m = typeof v === "string" ? /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(v.trim()) : null;
      if (m && !date) date = `${m[3]}-${MON[m[2]!.toLowerCase()]}-${m[1]!.padStart(2, "0")}`;
    }
    const tenor = cells.get("A");
    const ytm = cells.get("B");
    if (typeof tenor === "number" && typeof ytm === "number" && ytm > 0 && ytm < 30) curve.push({ tenor, ytm });
  }
  if (!date) throw new Error("FBIL par-yield sheet has no date header");
  if (date !== expectDate) throw new Error(`FBIL par-yield sheet is dated ${date}, expected ${expectDate}`);
  if (!curve.length) throw new Error("FBIL par-yield sheet has no curve rows");
  return { date, curve };
}

async function gsecParYield(map: Map<string, Obs[]>, days: number) {
  const dates = (await getJson<{ processRunDate?: string }[]>("/gsec/fetch?authenticated=false"))
    .map((d) => isoDay(d.processRunDate))
    .filter((d): d is string => !!d)
    .sort()
    .reverse()
    .slice(0, Math.max(1, days));
  if (!dates.length) throw new Error("FBIL G-Sec index is empty");
  for (const d of dates) {
    const res = await feedFetch(`${BASE}/gsec/downloadPublished?date=${d}&authenticated=false`, { timeoutMs: 40_000 });
    if (!res.ok) throw new Error(`FBIL G-Sec ${d} → HTTP ${res.status}`);
    const { curve } = parseParYield(new Uint8Array(await res.arrayBuffer()), d);
    for (const t of PAR_TENORS) {
      const pt = curve.find((c) => Math.abs(c.tenor - t) < 1e-9);
      if (pt) addObs(map, `fbil_gsec_par_${parLabel(t)}`, d, pt.ytm);
    }
    if (dates.length > 1) await sleep(400);
  }
}

function describe(id: string): { label: string; unit: string; link: string } {
  if (id.startsWith("fbil_ref_")) {
    const ccy = Object.values(REF_CCY).find((c) => c.id === id);
    return { label: `${id.slice(9).toUpperCase()}/INR reference rate`, unit: ccy?.unit ?? "₹", link: `${SITE}#/benchmark/fc` };
  }
  if (id === "fbil_mibor_on") return { label: "Overnight MIBOR", unit: "%", link: `${SITE}#/benchmark/mibor` };
  if (id.startsWith("fbil_gsec_par_")) return { label: `G-Sec par yield ${id.slice(14)}`, unit: "%", link: `${SITE}#/benchmark/gsec` };
  const single = PRODUCTS.find((x) => id === `fbil_${x.key}`);
  if (single) return { label: single.label, unit: single.unit, link: SITE };
  const p = PRODUCTS.find((x) => id.startsWith(`fbil_${x.key}_`))!;
  return { label: `${p.label} ${id.slice(`fbil_${p.key}_`.length).toUpperCase()}`, unit: p.unit, link: `${SITE}#/benchmark/${p.page}` };
}

export const fbilRates: Collector = {
  id: "fbil-rates",
  actionsOnly: true,
  timeoutMs: 180_000,
  async run() {
    const map = new Map<string, Obs[]>();
    const jobs: [string, () => Promise<void>][] = [
      ["refrates", () => referenceRates(map)],
      ["ovnmibor-history", () => overnightMiborHistory(map)],
      ["tbill-history", () => tbillHistory(map)],
      ...PRODUCTS.map((p): [string, () => Promise<void>] => [p.key, () => simpleProduct(map, p)]),
      ["gsec", () => gsecParYield(map, Number(process.env.FBIL_GSEC_DAYS) || 1)],
    ];
    const failed: string[] = [];
    for (const [name, job] of jobs) {
      try {
        await job();
      } catch (e) {
        failed.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await sleep(250);
    }
    const out = toSeries(map, describe);
    if (!out.length) throw new Error(`fbil-rates: nothing collected (${failed.join(" | ")})`);
    if (failed.length) console.warn(JSON.stringify({ level: "warn", msg: "fbil partial failure", failed }));
    return out;
  },
};
