#!/usr/bin/env tsx
/**
 * Snapshot writer (P3): precomputes research dossiers (and, with --panels, the
 * leadership + financials panels) into Upstash Redis so user requests only READ.
 * Same keys the API routes and the server-rendered research page use
 * (src/lib/research/panel-cache.ts). Runs on the Oracle VM (India IP) or GitHub Actions.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-warm-dossiers.ts [--panels] [--limit=200]
 *
 * ENV: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN) REQUIRED
 *      UPSTOX_ACCESS_TOKEN (quotes/candles), DATABASE_URL (optional: adds most-held symbols)
 *      WARM_SYMBOLS (optional, comma-separated extra symbols)
 * stdout: one JSON line { ok, symbols, warmed, failed, ms }
 */
import { cacheSetJson, hasRedis } from "@/lib/cache/redis";
import { hasDatabase, sql } from "@/lib/db";
import { getCompanyFinancials } from "@/lib/financials/service";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { buildResearchDetail } from "@/lib/feeds/research-detail";
import { getCompanyLeadership } from "@/lib/research/company-leadership";
import { dossierCacheKey, panelCacheKey } from "@/lib/research/panel-cache";

const args = process.argv.slice(2);
const withPanels = args.includes("--panels");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = Number(limitArg?.split("=")[1]) || 200;
const CONCURRENCY = 3;

async function pickSymbols(): Promise<string[]> {
  const set = new Set<string>(INDIA_EQUITIES.map((i) => i.symbol.toUpperCase()));
  for (const s of (process.env.WARM_SYMBOLS ?? "").split(",")) {
    if (s.trim()) set.add(s.trim().toUpperCase());
  }
  if (hasDatabase()) {
    try {
      const rows = (await sql()`
        SELECT upper(symbol) AS symbol, COUNT(*) AS n FROM portfolio_holdings
        GROUP BY upper(symbol) ORDER BY n DESC LIMIT 300`) as { symbol: string }[];
      for (const r of rows) set.add(r.symbol);
    } catch {
      /* holdings are optional */
    }
  }
  return [...set].filter((s) => /^[A-Z0-9&.\-]{1,20}$/.test(s)).slice(0, LIMIT);
}

async function warmOne(sym: string): Promise<boolean> {
  const dossier = await buildResearchDetail(sym);
  if (!dossier) return false;
  await cacheSetJson(dossierCacheKey(sym), dossier, 15 * 60);
  if (withPanels && dossier.market === "IN") {
    const [lead, fin] = await Promise.allSettled([getCompanyLeadership(sym), getCompanyFinancials(sym)]);
    if (lead.status === "fulfilled") {
      const d = lead.value;
      if (d.pay || d.holdings || d.dividends || d.people.length) {
        await cacheSetJson(panelCacheKey("leadership", sym), d, 7 * 24 * 60 * 60);
      }
    }
    if (fin.status === "fulfilled" && fin.value) {
      await cacheSetJson(panelCacheKey("financials", sym), fin.value, 3 * 24 * 60 * 60);
    }
  }
  return true;
}

async function main() {
  if (!hasRedis()) {
    console.log(JSON.stringify({ ok: false, error: "Redis env vars not set" }));
    process.exit(1);
  }
  const t0 = Date.now();
  const symbols = await pickSymbols();
  let warmed = 0;
  const failed: string[] = [];
  let next = 0;
  async function worker() {
    while (next < symbols.length) {
      const sym = symbols[next++]!;
      try {
        if (await warmOne(sym)) warmed++;
        else failed.push(sym);
      } catch {
        failed.push(sym);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(
    JSON.stringify({ ok: true, symbols: symbols.length, warmed, failed: failed.slice(0, 20), ms: Date.now() - t0 }),
  );
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
