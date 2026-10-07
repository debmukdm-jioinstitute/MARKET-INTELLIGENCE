#!/usr/bin/env tsx
/**
 * P4 worker: builds insight cards for each warmed symbol and stores them in Neon
 * (insight_cards). Reads the dossier from Redis when present (written by
 * run-warm-dossiers.ts), otherwise builds it. One LLM call per symbol, max.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-insights.ts [--limit=50]
 * ENV: DATABASE_URL (required), GROQ_API_KEY (optional: rules-only cards without it),
 *      Redis vars (optional), UPSTOX_ACCESS_TOKEN (only when Redis has no dossier)
 */
import { cacheGetJson } from "@/lib/cache/redis";
import { hasDatabase } from "@/lib/db";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { buildResearchDetail, type ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { generateInsightCards } from "@/lib/insights/engine";
import { saveInsightCards } from "@/lib/insights/store";
import { dossierCacheKey } from "@/lib/research/panel-cache";

const limitArg = process.argv.slice(2).find((a) => a.startsWith("--limit="));
const LIMIT = Number(limitArg?.split("=")[1]) || 50;

async function main() {
  if (!hasDatabase()) {
    console.log(JSON.stringify({ ok: false, error: "DATABASE_URL not set" }));
    process.exit(1);
  }
  const t0 = Date.now();
  const extra = (process.env.WARM_SYMBOLS ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const symbols = [...new Set([...INDIA_EQUITIES.map((i) => i.symbol.toUpperCase()), ...extra])].slice(0, LIMIT);
  let saved = 0;
  const failed: string[] = [];
  for (const sym of symbols) {
    try {
      const cached = await cacheGetJson<ResearchDetailPayload>(dossierCacheKey(sym));
      const dossier = cached?.value ?? (await buildResearchDetail(sym));
      if (!dossier) {
        failed.push(sym);
        continue;
      }
      const cards = await generateInsightCards(dossier);
      await saveInsightCards(dossier.symbol, cards);
      saved++;
    } catch {
      failed.push(sym);
    }
  }
  console.log(JSON.stringify({ ok: true, symbols: symbols.length, saved, failed: failed.slice(0, 20), ms: Date.now() - t0 }));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
