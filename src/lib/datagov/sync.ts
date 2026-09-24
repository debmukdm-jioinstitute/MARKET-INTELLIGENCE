import { DataGovAuthError, fetchResourcePage, searchCatalog } from "./client.ts";
import { ensureDataGovSchema, insertRecords, logSync, upsertCatalog } from "./store.ts";
import { sql } from "../db.ts";

/** Title searches that seed the tracked (auto-synced) set — market/macro-relevant datasets. */
export const WATCH_QUERIES: { q: string; take: number }[] = [
  { q: "Wholesale Price Index", take: 4 },
  { q: "Consumer Price Index", take: 4 },
  { q: "Index of Industrial Production", take: 3 },
  { q: "Gross Domestic Product", take: 3 },
  { q: "Foreign Exchange Reserves", take: 3 },
  { q: "Exchange Rate", take: 2 },
  { q: "Foreign Direct Investment", take: 3 },
  { q: "Bank Credit", take: 3 },
  { q: "Current Daily Price of Various Commodities", take: 2 }, // Agmarknet mandi prices (daily)
  { q: "Petroleum Products", take: 3 },
  { q: "Crude Oil", take: 3 },
  { q: "Fiscal Deficit", take: 2 },
  { q: "Balance of Payments", take: 2 },
];

/** Crawl catalog pages for a sector (or everything) into datagov_datasets. */
export async function syncCatalog(opts: { sector?: string; title?: string; maxPages?: number; pageSize?: number } = {}) {
  await ensureDataGovSchema();
  const pageSize = opts.pageSize ?? 100;
  let offset = 0;
  let stored = 0;
  let total = 0;
  for (let p = 0; p < (opts.maxPages ?? 10); p++) {
    const page = await searchCatalog({ sector: opts.sector, title: opts.title, offset, limit: pageSize });
    total = page.total;
    stored += await upsertCatalog(page.entries);
    offset += page.entries.length;
    if (!page.entries.length || offset >= page.total) break;
  }
  await logSync(null, `catalog:${opts.sector ?? opts.title ?? "all"}`, true, stored);
  return { stored, total };
}

export async function discoverTracked() {
  await ensureDataGovSchema();
  const ids: string[] = [];
  for (const w of WATCH_QUERIES) {
    const { entries } = await searchCatalog({ title: w.q, limit: w.take });
    await upsertCatalog(entries);
    ids.push(...entries.map((e) => e.id));
  }
  if (ids.length) await sql()`UPDATE datagov_datasets SET tracked = true WHERE id = ANY(${ids}::text[])`;
  return ids;
}

/**
 * Pull rows for one dataset within a time budget, resuming where the last run stopped.
 * Rows are deduped by content hash so re-running (or overlapping offsets) is safe.
 */
export async function syncDataset(id: string, opts: { budgetMs?: number; pageSize?: number } = {}) {
  await ensureDataGovSchema();
  const db = sql();
  const deadline = Date.now() + (opts.budgetMs ?? 45_000);
  const [row] = await db`SELECT rows_synced FROM datagov_datasets WHERE id = ${id}`;
  let offset = Number(row?.rows_synced ?? 0);
  let inserted = 0;
  let total = 0;
  try {
    while (Date.now() < deadline) {
      const page = await fetchResourcePage(id, { offset, limit: opts.pageSize ?? 1000 });
      total = page.total;
      if (!page.records.length) break;
      inserted += await insertRecords(id, page.records);
      offset += page.records.length;
      await db`UPDATE datagov_datasets SET rows_synced = ${offset}, source_total = ${total}, last_synced_at = now(), last_error = NULL WHERE id = ${id}`;
      if (offset >= total) break;
    }
    await logSync(id, "rows", true, inserted);
    return { id, inserted, offset, total, complete: offset >= total };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db`UPDATE datagov_datasets SET last_error = ${msg} WHERE id = ${id}`;
    await logSync(id, "rows", false, inserted, msg);
    if (e instanceof DataGovAuthError) throw e;
    return { id, inserted, offset, total, complete: false, error: msg };
  }
}

/** Cron entrypoint: least-recently-synced tracked datasets first, until the time budget runs out. */
export async function syncTracked(budgetMs = 50_000) {
  await ensureDataGovSchema();
  const db = sql();
  const start = Date.now();
  const due = await db`
    SELECT id FROM datagov_datasets WHERE tracked
    ORDER BY last_synced_at NULLS FIRST, refreshed_at LIMIT 25`;
  const results = [];
  for (const d of due) {
    const left = budgetMs - (Date.now() - start);
    if (left < 5_000) break;
    results.push(await syncDataset(String(d.id), { budgetMs: left }));
  }
  return results;
}
