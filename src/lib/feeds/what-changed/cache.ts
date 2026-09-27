import { hasDatabase, sql } from "@/lib/db";
import { ensureCollectorSchema, saveSeries } from "@/lib/collector/store";
import { buildMarketShifts, shiftsRefreshMs } from "@/lib/feeds/what-changed/build-shifts";
import type { MarketShiftsPayload } from "@/lib/feeds/what-changed/types";

const SERIES_ID = "panel:what-changed";

type Mem = { at: number; payload: MarketShiftsPayload };
let mem: Mem | null = null;

export async function loadPersistedShifts(): Promise<MarketShiftsPayload | null> {
  if (!hasDatabase()) return null;
  try {
    await ensureCollectorSchema();
    const rows = (await sql()`
      SELECT meta, fetched_at FROM collected_obs
      WHERE series_id = ${SERIES_ID}
      ORDER BY obs_date DESC, fetched_at DESC
      LIMIT 1
    `) as { meta: MarketShiftsPayload | null; fetched_at: Date | string }[];
    const meta = rows[0]?.meta;
    if (!meta?.items?.length) return null;
    return meta;
  } catch {
    return null;
  }
}

async function persistShifts(payload: MarketShiftsPayload) {
  if (!hasDatabase()) return;
  const day = payload.fetchedAt.slice(0, 10);
  await saveSeries({
    id: SERIES_ID,
    label: "What changed panel",
    unit: "json",
    category: "market",
    provider: "Market Intelligence",
    url: "/api/feeds/what-changed",
    obs: [{ date: day, value: payload.slot, meta: payload as unknown as Record<string, unknown> }],
  });
}

function fresh(payload: MarketShiftsPayload, at: number) {
  return Date.now() - at < shiftsRefreshMs();
}

/** Cached shifts — rebuild at most once per 3h unless force=true. */
export async function getMarketShiftsCached(force = false): Promise<MarketShiftsPayload> {
  if (!force && mem && fresh(mem.payload, mem.at)) return mem.payload;

  if (!force) {
    const persisted = await loadPersistedShifts();
    if (persisted) {
      const at = Date.parse(persisted.fetchedAt);
      if (Number.isFinite(at) && fresh(persisted, at)) {
        mem = { at, payload: persisted };
        return persisted;
      }
    }
  }

  const payload = await buildMarketShifts();
  const at = Date.now();
  mem = { at, payload };
  await persistShifts(payload).catch(() => {});
  return payload;
}
