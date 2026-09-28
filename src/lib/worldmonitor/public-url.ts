/** World Monitor global dashboard (self-hosted, proxied, or upstream). */

export const WORLDMONITOR_UPSTREAM_ORIGIN =
  process.env.NEXT_PUBLIC_WORLDMONITOR_UPSTREAM?.trim() ||
  process.env.WORLDMONITOR_UPSTREAM_ORIGIN?.trim() ||
  "https://www.worldmonitor.app";

export const WORLDMONITOR_UPSTREAM_REPO = "https://github.com/koala73/worldmonitor";

/** Same-origin proxy (see next.config rewrites) — avoids upstream iframe blocks. */
export const WORLDMONITOR_PROXY_PREFIX = "/worldmonitor";

/** Upstream World Monitor reads this on `document.documentElement.dataset.theme`. */
export const WORLDMONITOR_THEME_STORAGE_KEY = "worldmonitor-theme";

/** Default map view aligned with worldmonitor.app global dashboard deep link. */
export const WORLDMONITOR_DEFAULT_LAUNCH_SEARCH =
  "lat=0.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=conflicts,bases,hotspots,sanctions,weather,outages,protests,military,natural,ucdpEvents,ciiChoropleth";

export const WORLDMONITOR_DEFAULT_LAUNCH_PATH = `${WORLDMONITOR_PROXY_PREFIX}/dashboard?${WORLDMONITOR_DEFAULT_LAUNCH_SEARCH}`;

const custom = process.env.NEXT_PUBLIC_WORLDMONITOR_URL?.trim();

/** Primary launch URL inside Market Intelligence (logged-in users). */
export function worldMonitorLaunchPath(): string {
  if (custom) {
    try {
      const u = new URL(custom, "https://getmarketintelligence.in");
      if (u.origin === "https://getmarketintelligence.in" || u.pathname.startsWith(WORLDMONITOR_PROXY_PREFIX)) {
        return u.pathname + u.search;
      }
    } catch {
      /* relative */
      if (custom.startsWith("/")) return custom;
    }
  }
  return WORLDMONITOR_DEFAULT_LAUNCH_PATH;
}

/** External full-screen link when proxy disabled or for sharing. */
export function worldMonitorExternalUrl(): string {
  if (custom && (custom.startsWith("http://") || custom.startsWith("https://"))) return custom;
  return `${WORLDMONITOR_UPSTREAM_ORIGIN}/dashboard?${WORLDMONITOR_DEFAULT_LAUNCH_SEARCH}`;
}

export function worldMonitorUsesProxy(): boolean {
  const path = worldMonitorLaunchPath();
  return path.startsWith(WORLDMONITOR_PROXY_PREFIX);
}
