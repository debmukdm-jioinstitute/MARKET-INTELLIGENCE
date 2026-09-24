import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import { hasDatabase, sql } from "@/lib/db";
import { ols } from "./ols";

/**
 * Data-driven transmission map: multi-factor OLS of daily sector returns on global macro factors.
 * Sectors use NSE index-tracking ETFs as proxies (Yahoo has no usable history for most NSE sector indices).
 * Alignment: USD/INR is same-day; Brent, US 10Y and S&P 500 use the PRIOR US session (they close after India does).
 * Units: betas are % sector move per +1% factor move; the rates factor is per +10bp move in the US 10Y yield.
 */

export const FACTORS = [
  { id: "brent", label: "Brent crude", symbol: "BZ=F", unit: "% per +1%", lag: 1, kind: "pct" },
  { id: "usdinr", label: "USD/INR (rupee weakness)", symbol: "INR=X", unit: "% per +1%", lag: 0, kind: "pct" },
  { id: "us10y", label: "US 10Y yield", symbol: "^TNX", unit: "% per +10bp", lag: 1, kind: "diff10bp" },
  { id: "spx", label: "S&P 500", symbol: "^GSPC", unit: "% per +1%", lag: 1, kind: "pct" },
] as const;
export type FactorId = (typeof FACTORS)[number]["id"];

export const SECTORS = [
  { id: "nifty", label: "NIFTY 50 (market)", proxy: "NIFTYBEES.NS" },
  { id: "bank", label: "Banks", proxy: "BANKBEES.NS" },
  { id: "it", label: "IT", proxy: "ITBEES.NS" },
  { id: "pharma", label: "Pharma", proxy: "PHARMABEES.NS" },
  { id: "auto", label: "Auto", proxy: "AUTOBEES.NS" },
  { id: "fmcg", label: "FMCG", proxy: "FMCGIETF.NS" },
  { id: "metal", label: "Metals", proxy: "METALIETF.NS" },
  { id: "oilgas", label: "Oil & Gas", proxy: "OILIETF.NS" },
  { id: "infra", label: "Infra", proxy: "INFRABEES.NS" },
  { id: "psubank", label: "PSU Banks", proxy: "PSUBNKBEES.NS" },
  { id: "realty", label: "Realty", proxy: "MOREALTY.NS" },
  { id: "healthcare", label: "Healthcare", proxy: "HEALTHIETF.NS" },
] as const;
export type SectorId = (typeof SECTORS)[number]["id"];

export type SectorFit = {
  id: SectorId;
  label: string;
  proxy: string;
  betas: Record<FactorId, { beta: number; se: number; t: number }>;
  r2: number;
  residSd: number;
  n: number;
};

export type BetaPayload = {
  computedAt: string;
  windowStart: string;
  windowEnd: string;
  factors: { id: FactorId; label: string; unit: string }[];
  sectors: SectorFit[];
  method: string;
};

type Pt = { date: string; value: number };

function returns(series: Pt[], kind: "pct" | "diff10bp"): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1].value;
    const b = series[i].value;
    if (!(a > 0) || !Number.isFinite(b)) continue;
    out.set(series[i].date, kind === "pct" ? ((b - a) / a) * 100 : (b - a) * 10);
  }
  return out;
}

const dateOf = (p: { date: string }) => p.date.slice(0, 10);

/** Most recent factor return dated strictly before `d` (prior US session). */
function priorReturn(ret: Map<string, number>, dates: string[], d: string): number | null {
  let lo = 0, hi = dates.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] < d) { idx = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return idx >= 0 ? ret.get(dates[idx]) ?? null : null;
}

export async function computeBetas(): Promise<BetaPayload> {
  const [factorHist, sectorHist] = await Promise.all([
    Promise.all(FACTORS.map((f) => fetchYahooHistory(f.symbol, "2y").then((h) => h.map((p) => ({ date: dateOf(p), value: p.value }))))),
    Promise.all(SECTORS.map((s) => fetchYahooHistory(s.proxy, "2y").then((h) => h.map((p) => ({ date: dateOf(p), value: p.value })), () => [] as Pt[]))),
  ]);
  const factorRet = FACTORS.map((f, i) => returns(factorHist[i], f.kind));
  const factorDates = factorRet.map((m) => [...m.keys()].sort());

  const fits: SectorFit[] = [];
  let winStart = "9999", winEnd = "0000";
  SECTORS.forEach((s, si) => {
    const sret = returns(sectorHist[si], "pct");
    const X: number[][] = [];
    const y: number[] = [];
    const dates: string[] = [];
    for (const [d, r] of [...sret.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const row = FACTORS.map((f, fi) => (f.lag === 0 ? factorRet[fi].get(d) ?? null : priorReturn(factorRet[fi], factorDates[fi], d)));
      if (row.some((v) => v == null) || Math.abs(r) > 15) continue;
      X.push(row as number[]);
      y.push(r);
      dates.push(d);
    }
    const fit = ols(X, y);
    if (!fit) return;
    winStart = dates[0] < winStart ? dates[0] : winStart;
    winEnd = dates[dates.length - 1] > winEnd ? dates[dates.length - 1] : winEnd;
    fits.push({
      id: s.id,
      label: s.label,
      proxy: s.proxy,
      betas: Object.fromEntries(FACTORS.map((f, i) => [f.id, { beta: fit.betas[i], se: fit.se[i], t: fit.t[i] }])) as SectorFit["betas"],
      r2: fit.r2,
      residSd: fit.residSd,
      n: fit.n,
    });
  });
  if (!fits.length) throw new Error("Could not compute factor betas (no usable histories)");
  return {
    computedAt: new Date().toISOString(),
    windowStart: winStart,
    windowEnd: winEnd,
    factors: FACTORS.map((f) => ({ id: f.id, label: f.label, unit: f.unit })),
    sectors: fits,
    method: "Daily returns, ~2y window, multi-factor OLS. Sector = NSE index-tracking ETF proxy. Brent/US10Y/S&P use the prior US session; USD/INR same day. Betas are partial effects holding the other factors fixed; they describe history, not the future.",
  };
}

let mem: { at: number; value: BetaPayload } | null = null;
let table: Promise<void> | null = null;

async function ensureTable() {
  table ??= (async () => {
    await sql()`CREATE TABLE IF NOT EXISTS factor_betas (id bigserial PRIMARY KEY, computed_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL)`;
  })().catch((e) => { table = null; throw e; });
  return table;
}

export async function saveBetas(p: BetaPayload) {
  await ensureTable();
  await sql()`INSERT INTO factor_betas (payload) VALUES (${JSON.stringify(p)}::jsonb)`;
}

/** DB copy if < 36h old, else compute live (6h in-process cache). */
export async function getBetas(): Promise<BetaPayload> {
  if (mem && Date.now() - mem.at < 6 * 3_600_000) return mem.value;
  if (hasDatabase()) {
    try {
      await ensureTable();
      const rows = (await sql()`SELECT payload, computed_at FROM factor_betas ORDER BY computed_at DESC LIMIT 1`) as { payload: BetaPayload; computed_at: Date | string }[];
      if (rows[0] && Date.now() - new Date(rows[0].computed_at).getTime() < 36 * 3_600_000) {
        mem = { at: Date.now(), value: rows[0].payload };
        return rows[0].payload;
      }
    } catch { /* fall through to live compute */ }
  }
  const value = await computeBetas();
  mem = { at: Date.now(), value };
  if (hasDatabase()) await saveBetas(value).catch(() => {});
  return value;
}
