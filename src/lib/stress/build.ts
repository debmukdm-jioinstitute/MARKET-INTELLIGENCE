import { buildSnapshot } from "@/lib/snapshot";
import type { StressResult } from "./compute";

/** Live stress from the shared snapshot (same payload the dashboard uses; 60s in-process cache). */
export async function buildStress(): Promise<StressResult> {
  return (await buildSnapshot()).stress;
}
