import { buildIndiaDashboard } from "@/lib/feeds/india/build-dashboard";
import { computeStress, type StressResult } from "./compute";

let cache: { at: number; value: StressResult } | null = null;

/** Live stress from the same payload the dashboard uses; 60s in-process cache. */
export async function buildStress(): Promise<StressResult> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const value = computeStress(await buildIndiaDashboard());
  cache = { at: Date.now(), value };
  return value;
}
