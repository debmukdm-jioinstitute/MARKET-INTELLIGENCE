import { buildIndiaDashboard } from "@/lib/feeds/india/build-dashboard";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { computeStress, type StressResult } from "@/lib/stress/compute";
import { hasDatabase, sql } from "@/lib/db";

/** Metrics a user rule can reference. `unit` is what the threshold is expressed in. */
export const METRICS = {
  india_vix: { label: "India VIX", unit: "pts" },
  us_vix: { label: "US VIX", unit: "pts" },
  nifty: { label: "NIFTY 50", unit: "pts" },
  nifty_1d_pct: { label: "NIFTY 1-day change", unit: "%" },
  usdinr: { label: "USD/INR", unit: "₹" },
  usdinr_1d_pct: { label: "USD/INR 1-day change", unit: "%" },
  brent: { label: "Brent crude", unit: "$" },
  brent_1d_pct: { label: "Brent 1-day change", unit: "%" },
  us10y: { label: "US 10Y yield", unit: "%" },
  gsec10y: { label: "India 10Y G-Sec yield", unit: "%" },
  dxy_1d_pct: { label: "Dollar index 1-day change", unit: "%" },
  fii_net: { label: "FII net flow today", unit: "₹ cr" },
  dii_net: { label: "DII net flow today", unit: "₹ cr" },
  rbi_net_liquidity: { label: "RBI net liquidity (+ injected / − absorbed)", unit: "₹ cr" },
  stress_score: { label: "India Macro Stress Index", unit: "0–100" },
  convergence_score: { label: "Convergence score", unit: "0–100" },
  families_firing: { label: "Stress families firing", unit: "count" },
} as const;

export type MetricId = keyof typeof METRICS;
export type MetricValues = Record<MetricId, number | null>;

export type Snapshot = { asOf: string; dashboard: IndiaDashboardPayload; stress: StressResult; metrics: MetricValues };

const pctOf = (v: number | null | undefined) => (v == null ? null : v * 100);

export function metricsFrom(d: IndiaDashboardPayload, s: StressResult): MetricValues {
  return {
    india_vix: d.pulse.indiaVix.value,
    us_vix: d.globalRadar.vix?.value ?? null,
    nifty: d.pulse.nifty.value,
    nifty_1d_pct: pctOf(d.pulse.nifty.changePct),
    usdinr: d.pulse.usdInr.value,
    usdinr_1d_pct: pctOf(d.pulse.usdInr.changePct),
    brent: d.pulse.brent.value,
    brent_1d_pct: pctOf(d.pulse.brent.changePct),
    us10y: d.globalRadar.us10y?.value ?? null,
    gsec10y: d.pulse.gsec10y.value,
    dxy_1d_pct: pctOf(d.globalRadar.dxy?.changePct),
    fii_net: d.moneyFlow.fii.today,
    dii_net: d.moneyFlow.dii.today,
    rbi_net_liquidity: d.rbiLiquidity.systemLiquidity.netCr ?? null,
    stress_score: s.score,
    convergence_score: s.convergence.score,
    families_firing: s.convergence.firing.length,
  };
}

let cache: { at: number; value: Snapshot } | null = null;
let inFlight: Promise<Snapshot> | null = null;

async function getDbCachedSnapshot(): Promise<Snapshot | null> {
  if (!hasDatabase()) return null;
  try {
    const db = sql();
    const rows = await db`
      SELECT value, extract(epoch from (now() - updated_at)) as age_sec
      FROM app_cache
      WHERE key = 'market_snapshot' AND updated_at > now() - interval '60 seconds'
      LIMIT 1
    `;
    if (rows && rows.length > 0 && rows[0]?.value) {
      return rows[0].value as Snapshot;
    }
  } catch {
    // app_cache might not exist yet or connection error — non-fatal
  }
  return null;
}

async function setDbCachedSnapshot(value: Snapshot): Promise<void> {
  if (!hasDatabase()) return;
  try {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS app_cache (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`
      INSERT INTO app_cache (key, value, updated_at)
      VALUES ('market_snapshot', ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  } catch {
    // Non-fatal cache write failure
  }
}

export async function buildSnapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    // Check shared database cache first (survives cold serverless instances)
    const dbCached = await getDbCachedSnapshot();
    if (dbCached) {
      cache = { at: Date.now(), value: dbCached };
      return dbCached;
    }

    const dashboard = await buildIndiaDashboard();
    const stress = computeStress(dashboard);
    const value: Snapshot = {
      asOf: dashboard.fetchedAt,
      dashboard,
      stress,
      metrics: metricsFrom(dashboard, stress),
    };
    cache = { at: Date.now(), value };
    // Non-blocking write to database cache for other serverless instances
    setDbCachedSnapshot(value).catch(() => {});
    return value;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
