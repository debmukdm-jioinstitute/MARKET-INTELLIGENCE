import { fetchDataPage, listDatabaseIds, listIndicators } from "./client.ts";
import { data360RefAreas } from "./config.ts";
import { ensureData360Schema, logSync, obsKey } from "./store.ts";
import { sql } from "../db.ts";

const PAGE = 1000;

/** Fallback if facet search returns fewer IDs. */
export const CORE_DATABASES = [
  "WB_WDI",
  "IMF_BOP",
  "WB_EDSTATS",
  "WB_ES",
  "IMF_IFS",
  "WB_GS",
  "WB_FINDEX",
  "IMF_GFS_SOO",
  "BS_SGI",
  "WB_HNP",
] as const;

function extraDatasetsFromEnv(): string[] {
  const raw = process.env.DATA360_DATASETS?.trim();
  if (!raw) return [];
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

/** Upsert dataset rows from Data360 search facets (+ env extras). */
export async function syncDatasetCatalog() {
  await ensureData360Schema();
  const db = sql();
  const facets = await listDatabaseIds();
  const ids = new Map<string, number>();
  for (const f of facets) ids.set(f.id, f.count);
  for (const id of [...CORE_DATABASES, ...extraDatasetsFromEnv()]) {
    if (!ids.has(id)) ids.set(id, 0);
  }
  for (const [database_id, series_count] of ids) {
    await db`
      INSERT INTO data360_datasets (database_id, series_count, last_catalog_at)
      VALUES (${database_id}, ${series_count}, now())
      ON CONFLICT (database_id) DO UPDATE SET
        series_count = EXCLUDED.series_count,
        last_catalog_at = now(),
        last_error = NULL
    `;
  }
  await logSync(null, null, "catalog", true, ids.size);
  return { datasets: ids.size };
}

/** Pull indicator id list for one database (e.g. WB_WDI). */
export async function syncIndicatorCatalog(databaseId: string) {
  await ensureData360Schema();
  const db = sql();
  try {
    const ids = await listIndicators(databaseId);
    if (!ids.length) throw new Error("empty indicator list");
    await db`
      INSERT INTO data360_indicators (database_id, indicator_id, tracked)
      SELECT ${databaseId}, unnest(${ids}::text[]), true
      ON CONFLICT (database_id, indicator_id) DO NOTHING
    `;
    await ensureRefCursors(databaseId);
    await db`
      UPDATE data360_datasets SET indicators_cataloged = ${ids.length}, last_catalog_at = now(), last_error = NULL
      WHERE database_id = ${databaseId}
    `;
    await logSync(databaseId, null, "indicators", true, ids.length);
    return { databaseId, indicators: ids.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db`UPDATE data360_datasets SET last_error = ${msg} WHERE database_id = ${databaseId}`;
    await logSync(databaseId, null, "indicators", false, 0, msg);
    throw e;
  }
}

/** Catalog indicator ids for every dataset (one HTTP list per database). */
export async function syncAllIndicatorCatalogs() {
  await syncDatasetCatalog();
  const db = sql();
  const due = await db`SELECT database_id FROM data360_datasets ORDER BY database_id`;
  const results: { databaseId: string; indicators?: number; error?: string }[] = [];
  for (const row of due) {
    const id = String(row.database_id);
    try {
      const r = await syncIndicatorCatalog(id);
      results.push(r);
    } catch (e) {
      results.push({ databaseId: id, error: e instanceof Error ? e.message : String(e) });
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return results;
}

async function ensureRefCursors(databaseId: string) {
  const refs = data360RefAreas();
  const db = sql();
  for (const ref_area of refs) {
    await db`
      INSERT INTO data360_ref_cursors (database_id, indicator_id, ref_area)
      SELECT database_id, indicator_id, ${ref_area}
      FROM data360_indicators
      WHERE database_id = ${databaseId} AND tracked
      ON CONFLICT (database_id, indicator_id, ref_area) DO NOTHING
    `;
  }
}

async function refreshIndicatorComplete(databaseId: string, indicatorId: string) {
  const db = sql();
  const refs = data360RefAreas();
  const [row] = await db`
    SELECT count(*) FILTER (WHERE complete)::int AS done, count(*)::int AS total
    FROM data360_ref_cursors
    WHERE database_id = ${databaseId} AND indicator_id = ${indicatorId} AND ref_area = ANY(${refs}::text[])
  `;
  const complete = Number(row?.total ?? 0) > 0 && Number(row?.done) === Number(row?.total);
  await db`
    UPDATE data360_indicators SET complete = ${complete}, last_synced_at = now()
    WHERE database_id = ${databaseId} AND indicator_id = ${indicatorId}
  `;
}

async function insertObservations(databaseId: string, indicatorId: string, rows: Record<string, unknown>[]) {
  const allowed = new Set(data360RefAreas());
  const filtered = rows.filter((r) => allowed.has(String(r.REF_AREA ?? "").toUpperCase()));
  if (!filtered.length) return 0;
  const db = sql();
  const keys: string[] = [];
  const dbIds: string[] = [];
  const indIds: string[] = [];
  const refs: string[] = [];
  const periods: string[] = [];
  const values: (number | null)[] = [];
  const units: (string | null)[] = [];
  const freqs: (string | null)[] = [];
  const payloads: string[] = [];

  for (const r of filtered) {
    const key = obsKey(r);
    keys.push(key);
    dbIds.push(databaseId);
    indIds.push(indicatorId);
    refs.push(String(r.REF_AREA ?? ""));
    periods.push(String(r.TIME_PERIOD ?? ""));
    const v = r.OBS_VALUE != null && r.OBS_VALUE !== "" ? Number(r.OBS_VALUE) : null;
    values.push(Number.isFinite(v) ? v : null);
    units.push(r.UNIT_MEASURE != null ? String(r.UNIT_MEASURE) : null);
    freqs.push(r.FREQ != null ? String(r.FREQ) : null);
    payloads.push(JSON.stringify(r));
  }

  await db`
    INSERT INTO data360_observations (obs_key, database_id, indicator_id, ref_area, time_period, obs_value, unit_measure, freq, payload)
    SELECT k, d, i, r, p, v, u, f, payload::jsonb
    FROM unnest(
      ${keys}::text[], ${dbIds}::text[], ${indIds}::text[], ${refs}::text[], ${periods}::text[],
      ${values}::numeric[], ${units}::text[], ${freqs}::text[], ${payloads}::text[]
    ) AS t(k, d, i, r, p, v, u, f, payload)
    ON CONFLICT (obs_key) DO UPDATE SET
      obs_value = EXCLUDED.obs_value,
      payload = EXCLUDED.payload,
      synced_at = now()
  `;
  return filtered.length;
}

/** Paginate one indicator + country until complete or budget exhausted. */
export async function syncIndicatorRefData(
  databaseId: string,
  indicatorId: string,
  refArea: string,
  budgetMs = 40_000,
) {
  await ensureData360Schema();
  const db = sql();
  const deadline = Date.now() + budgetMs;
  const [row] = await db`
    SELECT data_skip, obs_total, complete FROM data360_ref_cursors
    WHERE database_id = ${databaseId} AND indicator_id = ${indicatorId} AND ref_area = ${refArea}
  `;
  if (!row || row.complete) {
    return { databaseId, indicatorId, refArea, inserted: 0, complete: true };
  }

  let skip = Number(row.data_skip ?? 0);
  let total = Number(row.obs_total ?? 0);
  let inserted = 0;

  try {
    while (Date.now() < deadline) {
      const page = await fetchDataPage({
        databaseId,
        indicator: indicatorId,
        refArea,
        skip,
        top: PAGE,
      });
      total = page.count ?? total;
      if (!page.value?.length) {
        await db`
          UPDATE data360_ref_cursors SET complete = true, obs_total = ${total}, last_synced_at = now(), last_error = NULL
          WHERE database_id = ${databaseId} AND indicator_id = ${indicatorId} AND ref_area = ${refArea}
        `;
        break;
      }
      inserted += await insertObservations(databaseId, indicatorId, page.value as Record<string, unknown>[]);
      skip += page.value.length;
      const complete = total > 0 ? skip >= total : page.value.length < PAGE;
      await db`
        UPDATE data360_ref_cursors SET
          data_skip = ${skip},
          obs_total = ${total},
          complete = ${complete},
          last_synced_at = now(),
          last_error = NULL
        WHERE database_id = ${databaseId} AND indicator_id = ${indicatorId} AND ref_area = ${refArea}
      `;
      if (complete) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    await refreshIndicatorComplete(databaseId, indicatorId);
    await logSync(databaseId, `${indicatorId}:${refArea}`, "data", true, inserted);
    return { databaseId, indicatorId, refArea, inserted, skip, total, complete: skip >= total };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db`
      UPDATE data360_ref_cursors SET last_error = ${msg}
      WHERE database_id = ${databaseId} AND indicator_id = ${indicatorId} AND ref_area = ${refArea}
    `;
    await logSync(databaseId, `${indicatorId}:${refArea}`, "data", false, inserted, msg);
    return { databaseId, indicatorId, refArea, inserted, skip, total, complete: false, error: msg };
  }
}

/** Cron: sync next incomplete indicators until time budget runs out. */
export async function syncTrackedData(budgetMs = 55_000) {
  await ensureData360Schema();
  const db = sql();
  const refs = data360RefAreas();
  const start = Date.now();
  for (const row of await db`SELECT DISTINCT database_id FROM data360_indicators WHERE tracked`) {
    await ensureRefCursors(String(row.database_id));
  }
  await db`
    UPDATE data360_indicators i SET complete = false
    FROM data360_ref_cursors c
    WHERE c.database_id = i.database_id AND c.indicator_id = i.indicator_id
      AND i.tracked AND NOT c.complete AND c.ref_area = ANY(${refs}::text[])
  `;
  const due = await db`
    SELECT c.database_id, c.indicator_id, c.ref_area
    FROM data360_ref_cursors c
    JOIN data360_indicators i ON i.database_id = c.database_id AND i.indicator_id = c.indicator_id
    WHERE i.tracked AND NOT c.complete AND c.ref_area = ANY(${refs}::text[])
    ORDER BY c.last_synced_at NULLS FIRST, c.database_id, c.indicator_id, c.ref_area
    LIMIT 48
  `;
  const results = [];
  for (const d of due) {
    const left = budgetMs - (Date.now() - start);
    if (left < 6_000) break;
    results.push(
      await syncIndicatorRefData(
        String(d.database_id),
        String(d.indicator_id),
        String(d.ref_area),
        Math.min(left, 25_000),
      ),
    );
  }
  return results;
}

export async function syncStatus() {
  await ensureData360Schema();
  const db = sql();
  const [datasets] = await db`
    SELECT count(*)::int AS n, coalesce(sum(indicators_cataloged),0)::int AS indicators
    FROM data360_datasets
  `;
  const refs = data360RefAreas();
  const [ind] = await db`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE complete)::int AS complete,
      count(*) FILTER (WHERE NOT complete)::int AS pending
    FROM data360_indicators WHERE tracked
  `;
  const [cursors] = await db`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE complete)::int AS complete
    FROM data360_ref_cursors
    WHERE ref_area = ANY(${refs}::text[])
  `;
  const [obs] = await db`
    SELECT count(*)::int AS n FROM data360_observations WHERE ref_area = ANY(${refs}::text[])
  `;
  return {
    refAreas: refs,
    datasets: datasets?.n ?? 0,
    indicatorsCataloged: datasets?.indicators ?? 0,
    indicators: ind?.total ?? 0,
    indicatorsComplete: ind?.complete ?? 0,
    indicatorsPending: ind?.pending ?? 0,
    refCursors: cursors?.total ?? 0,
    refCursorsComplete: cursors?.complete ?? 0,
    observations: obs?.n ?? 0,
  };
}
