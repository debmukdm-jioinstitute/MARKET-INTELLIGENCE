import { readAppCache, writeAppCache } from "@/lib/app-cache";
import type { IndiaDashboardQuickPayload } from "@/lib/feeds/india/build-dashboard";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

export const INDIA_DASHBOARD_CACHE_KEY = "india_dashboard";

export type PersistedIndiaDashboard = IndiaDashboardQuickPayload | IndiaDashboardPayload;

export function quickPayloadFromDashboard(
  payload: IndiaDashboardPayload,
): IndiaDashboardQuickPayload {
  return {
    fetchedAt: payload.fetchedAt,
    pulse: payload.pulse,
    globalRadar: payload.globalRadar,
    indiaImpact: payload.indiaImpact,
    moneyFlow: payload.moneyFlow,
    indiaMacro: payload.indiaMacro,
    rbiLiquidity: {
      systemLiquidity: payload.rbiLiquidity.systemLiquidity,
      corridor: payload.rbiLiquidity.corridor,
      fxReserves: payload.rbiLiquidity.fxReserves,
      rows: payload.rbiLiquidity.rows,
    },
  };
}

export async function loadPersistedIndiaDashboard(): Promise<PersistedIndiaDashboard | null> {
  const row = await readAppCache<PersistedIndiaDashboard>(INDIA_DASHBOARD_CACHE_KEY);
  return row?.value ?? null;
}

export async function persistIndiaDashboard(payload: PersistedIndiaDashboard): Promise<void> {
  const toStore =
    "indiaMoving" in payload ? quickPayloadFromDashboard(payload as IndiaDashboardPayload) : payload;
  await writeAppCache(INDIA_DASHBOARD_CACHE_KEY, toStore);
}
