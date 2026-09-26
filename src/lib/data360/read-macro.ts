import type { MacroRow } from "@/lib/feeds/india/types";
import { hasDatabase, sql } from "@/lib/db";
import {
  DATA360_MACRO_DATABASE,
  countryToRefArea,
  data360ExplorerHref,
  v2CodeToData360Indicator,
} from "./macro-catalog.ts";
import { ensureData360Schema } from "./store.ts";

function sortPeriod(a: string, b: string): number {
  if (/^\d{4}$/.test(a) && /^\d{4}$/.test(b)) return a.localeCompare(b);
  return a.localeCompare(b);
}

/** Latest WDI points for one country from Postgres mirror (IND / USA). */
export async function fetchWorldBankFromData360Mirror(
  country: string,
  wbCode: string,
  name: string,
  unit: string,
): Promise<MacroRow | null> {
  if (!hasDatabase()) return null;
  await ensureData360Schema();
  const refArea = countryToRefArea(country);
  const indicatorId = v2CodeToData360Indicator(wbCode);
  const db = sql();
  const rows = (await db`
    SELECT time_period, obs_value, synced_at
    FROM data360_observations
    WHERE database_id = ${DATA360_MACRO_DATABASE}
      AND indicator_id = ${indicatorId}
      AND ref_area = ${refArea}
      AND obs_value IS NOT NULL
    ORDER BY time_period DESC
    LIMIT 32
  `) as { time_period: string; obs_value: number; synced_at: string }[];

  if (!rows.length) return null;

  const history = [...rows]
    .reverse()
    .map((r) => ({ date: r.time_period, value: Number(r.obs_value) }))
    .sort((a, b) => sortPeriod(a.date, b.date));

  const current = history[history.length - 1]?.value ?? null;
  const previous = history[history.length - 2]?.value ?? null;
  let direction: MacroRow["direction"] = "na";
  if (current != null && previous != null) {
    if (current > previous * 1.001) direction = "up";
    else if (current < previous * 0.999) direction = "down";
    else direction = "flat";
  }

  const latestSync = rows[0]?.synced_at;
  const period = history[history.length - 1]?.date;
  const explorer = data360ExplorerHref(DATA360_MACRO_DATABASE, indicatorId, refArea);

  return {
    id: `${refArea}_${wbCode}`,
    indicator: name,
    current,
    previous,
    unit,
    direction,
    history12m: history.slice(-24),
    source: {
      provider: "World Bank",
      url: explorer,
      asOf: period ? `${period}${latestSync ? ` · synced ${latestSync.slice(0, 10)}` : ""}` : latestSync,
    },
  };
}

export async function data360MirrorHealth(): Promise<{ ok: boolean; observations: number; pending: number }> {
  if (!hasDatabase()) return { ok: false, observations: 0, pending: 0 };
  try {
    await ensureData360Schema();
    const db = sql();
    const [obs] = await db`SELECT count(*)::int AS n FROM data360_observations WHERE ref_area IN ('IND','USA')`;
    const [pending] = await db`
      SELECT count(*)::int AS n FROM data360_ref_cursors WHERE NOT complete AND ref_area IN ('IND','USA')
    `;
    const n = obs?.n ?? 0;
    return { ok: n > 0, observations: n, pending: pending?.n ?? 0 };
  } catch {
    return { ok: false, observations: 0, pending: 0 };
  }
}
