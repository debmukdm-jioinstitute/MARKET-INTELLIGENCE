import type { IndiaDashboardQuickPayload } from "@/lib/feeds/india/build-dashboard";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

const LS_KEY = "mi_india_dashboard_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Stored = { savedAt: number; dashboard: IndiaDashboardPayload };

export function readDashboardClientCache(): IndiaDashboardPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.dashboard?.fetchedAt) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed.dashboard;
  } catch {
    return null;
  }
}

export function writeDashboardClientCache(dashboard: IndiaDashboardPayload | IndiaDashboardQuickPayload): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Stored = { savedAt: Date.now(), dashboard: dashboard as IndiaDashboardPayload };
    window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
