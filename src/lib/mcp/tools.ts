import { z } from "zod";
import { getRbiHomeMarket } from "@/lib/collector/rbi-live";
import { classify } from "@/lib/collector/freshness";
import { collectorStatus } from "@/lib/collector/store";
import { hasDatabase } from "@/lib/db";
import { latestBriefs } from "@/lib/brief/store";
import { buildSecurityRisk } from "@/lib/feeds/security-risk";
import { buildSnapshot, METRICS } from "@/lib/snapshot";
import { getBacktest } from "@/lib/stress/backtest";
import { getBetas } from "@/lib/transmission/betas";
import { applyShocks, PRESETS, SHOCK_BOUNDS } from "@/lib/transmission/scenario";

type Json = Record<string, unknown>;
export type Tool = {
  name: string;
  description: string;
  inputSchema: Json;
  run: (args: Json) => Promise<unknown>;
};

const num = (k: keyof typeof SHOCK_BOUNDS) => z.number().finite().min(SHOCK_BOUNDS[k][0]).max(SHOCK_BOUNDS[k][1]).optional();
const ScenarioArgs = z.object({ brent: num("brent"), usdinr: num("usdinr"), us10y_bp: num("us10y_bp"), spx: num("spx") });
const SymbolArgs = z.object({ symbol: z.string().regex(/^[A-Za-z0-9.&^-]{1,20}$/) });

const empty = { type: "object", properties: {}, additionalProperties: false };

/** All tools are READ-ONLY views of the site's own computed data. */
export const TOOLS: Tool[] = [
  {
    name: "get_market_snapshot",
    description: "Current values of the metrics used across the site: India/US VIX, NIFTY, USD/INR, Brent, US10Y, India 10Y, FII/DII flow, RBI net liquidity, stress and convergence scores. Units are in the metric catalog.",
    inputSchema: empty,
    run: async () => {
      const s = await buildSnapshot();
      return { asOf: s.asOf, metrics: s.metrics, catalog: METRICS };
    },
  },
  {
    name: "get_stress_index",
    description: "India Macro Stress Index (0-100 heuristic): score, band, per-input components, signal families and the convergence (3+ families stressed) state. Not a fitted model.",
    inputSchema: empty,
    run: async () => (await buildSnapshot()).stress,
  },
  {
    name: "get_stress_backtest",
    description: "Historical test of the stress index's market-based inputs versus forward NIFTY returns (buckets, downside probability, verdict, caveats).",
    inputSchema: empty,
    run: getBacktest,
  },
  {
    name: "get_rbi_rates",
    description: "RBI policy corridor (repo, SDF, MSF, bank rate, CRR, SLR) and system liquidity (net injected/absorbed, INR crore) as shown on the site.",
    inputSchema: empty,
    run: async () => {
      const d = (await buildSnapshot()).dashboard;
      return { corridor: d.rbiLiquidity.corridor ?? null, systemLiquidity: d.rbiLiquidity.systemLiquidity, fxReserves: d.rbiLiquidity.fxReserves ?? null };
    },
  },
  {
    name: "get_india_yield_curve",
    description: "India yield curve from RBI-published points: T-bill cut-offs and benchmark G-sec yields, plus call money range. No interpolation.",
    inputSchema: empty,
    run: async () => (await getRbiHomeMarket()) ?? { error: "RBI source unreachable" },
  },
  {
    name: "get_transmission_betas",
    description: "Measured sensitivity of Indian sector proxies to Brent, USD/INR, US10Y (per 10bp) and S&P 500, with t-stats and R². Descriptive of the past.",
    inputSchema: { type: "object", properties: { sector: { type: "string", description: "optional sector id, e.g. bank, it, auto, nifty" } }, additionalProperties: false },
    run: async (args) => {
      const b = await getBetas();
      const sector = typeof args.sector === "string" ? args.sector : null;
      return sector ? { ...b, sectors: b.sectors.filter((s) => s.id === sector) } : b;
    },
  },
  {
    name: "run_scenario",
    description: "Apply macro shocks and get model-implied same-day % impact per Indian sector. Args (all optional): brent (% move, -60..100), usdinr (% move, -15..25), us10y_bp (basis points, -200..300), spx (% move, -50..40). Presets: " + PRESETS.map((p) => p.id).join(", ") + ".",
    inputSchema: {
      type: "object",
      properties: {
        brent: { type: "number" }, usdinr: { type: "number" }, us10y_bp: { type: "number" }, spx: { type: "number" },
      },
      additionalProperties: false,
    },
    run: async (args) => {
      const shocks = ScenarioArgs.parse(args);
      const b = await getBetas();
      return { shocks, impacts: applyShocks(b, shocks), method: b.method, window: [b.windowStart, b.windowEnd] };
    },
  },
  {
    name: "get_daily_brief",
    description: "Most recent stored daily brief (pre-market or post-close) with its cited fact sheet. Returns an error if none has been generated yet.",
    inputSchema: empty,
    run: async () => {
      const [b] = hasDatabase() ? await latestBriefs(1) : [];
      return b ?? { error: "No brief stored yet" };
    },
  },
  {
    name: "get_security_risk",
    description: "Risk & events for one symbol from 1y of daily bars: realized vol, ATR(14), max drawdown, beta vs NIFTY/S&P, 52-week position, next earnings (India), recent Form 4 filings (US). Not a rating.",
    inputSchema: { type: "object", properties: { symbol: { type: "string", description: "e.g. TCS, RELIANCE, AAPL" } }, required: ["symbol"], additionalProperties: false },
    run: async (args) => (await buildSecurityRisk(SymbolArgs.parse(args).symbol)) ?? { error: "Not enough price history" },
  },
  {
    name: "get_data_health",
    description: "Freshness (fresh/stale/failing/pending) and source of every series stored by the scheduled collector.",
    inputSchema: empty,
    run: async () => {
      if (!hasDatabase()) return { error: "Collector database not configured" };
      const rows = (await collectorStatus()) as unknown as { id: string; last_ok: string | null; last_error: string | null; latest_date: string | null; [k: string]: unknown }[];
      return rows.filter((r) => !r.id.startsWith("collector:")).map((r) => ({ ...r, status: classify(r) }));
    },
  },
];
