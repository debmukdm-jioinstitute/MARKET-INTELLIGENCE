#!/usr/bin/env tsx
/**
 * Oracle Always Free: feed-hub warmer (was: Vercel GET /api/cron/warm-feed-hub).
 *
 * Performs IDENTICAL work to the route: forces a fresh feed-hub build via
 * getFeedHubCached(true), then persists per-source outcomes for the source-
 * health monitor via recordSourceResults(feedHealthToResults(health)) —
 * best-effort (a recording failure must not fail the warm itself).
 * No HTTP, no cronUnauthorized — the VM is the trust boundary.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-warm-feed-hub.ts
 *
 * stdout: { ok, fetchedAt, newsCount, openSources } on success
 *         { ok: false, error } on failure (exits 1).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (optional — only
 *       used by the best-effort source-health recording; the warm itself
 *       runs fine without a DB)
 *
 * NOTE: unlike the other oracle runners this one needs NO database env var,
 * exactly like the route (which has no hasDatabase guard). The source-health
 * recording no-ops internally when no DB is configured.
 */
import { getFeedHubCached } from "@/lib/feeds/hub-cache";
import { feedHealthToResults, recordSourceResults } from "@/lib/health/sources";

const SCRIPT = "run-warm-feed-hub";

async function main(): Promise<void> {
  try {
    const payload = await getFeedHubCached(true);
    // Persist per-source outcomes for the source-health monitor.
    // Best-effort: a recording failure must not fail the warm itself.
    await recordSourceResults(feedHealthToResults(payload.health)).catch(() => {});
    console.log(
      JSON.stringify({
        ok: true,
        fetchedAt: payload.fetchedAt,
        newsCount: payload.news.length,
        openSources: payload.health.filter((h) =>
          ["reddit", "livemint", "moneycontrol", "googlenews", "busstd", "rsswire"].includes(h.id),
        ),
      }),
    );
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "warm failed" }));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(
    JSON.stringify({
      level: "error",
      script: SCRIPT,
      msg: "runner crashed",
      error: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
