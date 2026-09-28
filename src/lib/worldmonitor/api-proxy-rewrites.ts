import type { Rewrite } from "next/dist/lib/load-custom-routes";

/**
 * World Monitor dashboard (proxied at /worldmonitor/*) calls same-origin `/api/*`.
 * Market Intelligence does not implement those handlers — proxy to upstream finance host.
 * Keep paths disjoint from MI routes (e.g. `/api/scenario` stays local; only `/api/scenario/v1/*` proxies).
 */
export const WORLDMONITOR_API_PREFIXES = [
  "aviation",
  "bootstrap",
  "displacement",
  "economic",
  "forecast",
  "intelligence",
  "leads",
  "market",
  "military",
  "news",
  "resilience",
  "sanctions",
  "scorecard",
  "supply-chain",
  "trade",
] as const;

/** Single-segment WM API paths (no sub-routes on MI). */
export const WORLDMONITOR_API_EXACT = [
  "analytics-health",
  "chat-analyst",
  "create-checkout",
  "fwdstart",
  "geo",
  "gpsjam",
  "llm-health",
  "mcp-proxy",
  "notify",
  "opensky",
  "product-catalog",
  "register-interest",
  "send",
  "user-prefs",
  "version",
  "widget-agent",
  "wm-session",
] as const;

export function worldMonitorApiRewrites(upstreamOrigin: string): Rewrite[] {
  const base = upstreamOrigin.replace(/\/$/, "");
  const rules: Rewrite[] = [];

  for (const prefix of WORLDMONITOR_API_PREFIXES) {
    rules.push(
      { source: `/api/${prefix}`, destination: `${base}/api/${prefix}` },
      { source: `/api/${prefix}/:path*`, destination: `${base}/api/${prefix}/:path*` },
    );
  }

  for (const exact of WORLDMONITOR_API_EXACT) {
    rules.push({ source: `/api/${exact}`, destination: `${base}/api/${exact}` });
  }

  rules.push(
    { source: "/api/scenario/v1/:path*", destination: `${base}/api/scenario/v1/:path*` },
    { source: "/api/v2/:path*", destination: `${base}/api/v2/:path*` },
  );

  return rules;
}
