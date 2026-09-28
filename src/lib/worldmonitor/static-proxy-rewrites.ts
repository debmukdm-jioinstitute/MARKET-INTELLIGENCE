import type { Rewrite } from "next/dist/lib/load-custom-routes";

/** Static geo assets for World Monitor map layers (must not collide with MI `/data/*` pages). */
export const WORLDMONITOR_DATA_ASSETS = [
  "/data/countries-110m.json",
  "/data/countries-50m.json",
  "/data/countries.geojson",
] as const;

export function worldMonitorStaticRewrites(upstreamOrigin: string): Rewrite[] {
  const base = upstreamOrigin.replace(/\/$/, "");
  return WORLDMONITOR_DATA_ASSETS.map((source) => ({
    source,
    destination: `${base}${source}`,
  }));
}
