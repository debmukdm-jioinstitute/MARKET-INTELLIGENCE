#!/usr/bin/env tsx
/**
 * GitHub Actions disclosures runner — the free collector for company IR
 * disclosures behind /intelligence/company.
 *
 * Fetches NSE's corporate-announcements feed (public, keyless) inside the
 * Actions runner and POSTs the rows to POST /api/collector/ingest's sibling
 * /api/collector/disclosures-ingest. This script NEVER touches the database
 * directly and NEVER invents data: an empty or failed fetch posts nothing, so
 * last-good rows on the site are preserved.
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/collectors/run-disclosures.ts
 *     [--ingest-url=https://getmarketintelligence.in/api/collector/disclosures-ingest]
 *     [--secret=$CRON_SECRET]
 *
 * Env fallbacks: SITE_URL (ingest defaults to $SITE_URL/api/collector/disclosures-ingest),
 * CRON_SECRET. Exits 0 when the ingest POST landed; exits 1 otherwise.
 */

import { feedFetch } from "@/lib/feeds/http";
import { fetchNseAnnouncements } from "@/lib/disclosures/nse";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

async function main() {
  const site = (process.env.SITE_URL ?? "https://getmarketintelligence.in").replace(/\/$/, "");
  const ingestUrl = arg("ingest-url") ?? `${site}/api/collector/disclosures-ingest`;
  const secret = arg("secret") ?? process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      JSON.stringify({ level: "error", msg: "CRON_SECRET is not set — refusing to run without ingest auth" }),
    );
    process.exit(2);
  }

  let items;
  try {
    items = await fetchNseAnnouncements();
  } catch (e) {
    console.error(
      JSON.stringify({ level: "error", msg: "NSE announcements fetch failed", error: e instanceof Error ? e.message : String(e) }),
    );
    process.exit(1);
  }
  console.log(JSON.stringify({ level: "info", msg: "fetched NSE announcements", count: items.length, ingestUrl }));

  let res: Response;
  try {
    res = await feedFetch(ingestUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ disclosures: items }),
      timeoutMs: 30_000,
      attempts: 3,
    });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "ingest POST failed", error: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  }
  const text = await res.text().catch(() => "");
  console.log(JSON.stringify({ level: "info", msg: "ingest response", status: res.status, body: text.slice(0, 2000) }));
  if (!res.ok) process.exit(1);
  console.log(JSON.stringify({ level: "info", msg: "done", count: items.length }));
}

main().catch((e) => {
  console.error(JSON.stringify({ level: "error", msg: "runner crashed", error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
