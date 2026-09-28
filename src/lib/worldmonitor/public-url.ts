/** Finance-variant World Monitor UI (self-hosted, proxied, or upstream). */

export const WORLDMONITOR_UPSTREAM_ORIGIN = "https://finance.worldmonitor.app";
export const WORLDMONITOR_UPSTREAM_REPO = "https://github.com/koala73/worldmonitor";

/** Same-origin proxy (see next.config rewrites) — avoids upstream iframe blocks. */
export const WORLDMONITOR_PROXY_PREFIX = "/worldmonitor";

/** Upstream World Monitor reads this on `document.documentElement.dataset.theme`. */
export const WORLDMONITOR_THEME_STORAGE_KEY = "worldmonitor-theme";

const custom = process.env.NEXT_PUBLIC_WORLDMONITOR_URL?.trim();

/** Primary launch URL inside Market Intelligence (logged-in users). */
export function worldMonitorLaunchPath(): string {
  if (custom) {
    try {
      const u = new URL(custom);
      if (u.origin === "https://getmarketintelligence.in" || u.pathname.startsWith(WORLDMONITOR_PROXY_PREFIX)) {
        return u.pathname + u.search;
      }
    } catch {
      /* relative */
      if (custom.startsWith("/")) return custom;
    }
  }
  return `${WORLDMONITOR_PROXY_PREFIX}/dashboard`;
}

/** External full-screen link when proxy disabled or for sharing. */
export function worldMonitorExternalUrl(): string {
  if (custom && (custom.startsWith("http://") || custom.startsWith("https://"))) return custom;
  return `${WORLDMONITOR_UPSTREAM_ORIGIN}/dashboard`;
}

export function worldMonitorUsesProxy(): boolean {
  const path = worldMonitorLaunchPath();
  return path.startsWith(WORLDMONITOR_PROXY_PREFIX);
}
