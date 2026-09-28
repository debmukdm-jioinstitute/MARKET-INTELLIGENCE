import {
  WORLDMONITOR_API_EXACT,
  WORLDMONITOR_API_PREFIXES,
} from "@/lib/worldmonitor/api-proxy-rewrites";

/** Path under `/api/` (no leading slash), e.g. `market/v1/list-market-quotes`. */
export function isWorldMonitorProxiedApiPath(apiSubPath: string): boolean {
  const path = apiSubPath.replace(/^\/+/, "");
  if (!path) return false;
  const root = path.split("/")[0] ?? "";
  if ((WORLDMONITOR_API_PREFIXES as readonly string[]).includes(root)) return true;
  if ((WORLDMONITOR_API_EXACT as readonly string[]).includes(path) || (WORLDMONITOR_API_EXACT as readonly string[]).includes(root)) {
    return true;
  }
  if (path.startsWith("scenario/v1/") || path === "scenario/v1") return true;
  if (path.startsWith("v2/") || path === "v2") return true;
  return false;
}
