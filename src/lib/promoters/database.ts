import type { PromoterActivityRecord } from "./types";

/**
 * Promoter / insider disclosure data source.
 *
 * There is currently NO live feed for India promoter/insider (SAST/PIT)
 * disclosures wired into this app, so every accessor below honestly returns
 * an empty result set with status "UNAVAILABLE".
 *
 * Do NOT add hardcoded records here. Fabricated disclosures — invented trades,
 * share counts, prices, or stake changes attributed to real people or
 * companies — must never be served to users.
 */
export const PROMOTER_DATA_STATUS = "UNAVAILABLE" as const;

export function getAllPromoterActivities(): PromoterActivityRecord[] {
  return [];
}

export function filterPromoterActivities(_filters?: {
  category?: string;
  sector?: string;
  symbol?: string;
  riskImpact?: string;
  search?: string;
}): PromoterActivityRecord[] {
  return [];
}

export function getPromoterActivitiesBySymbol(_symbol: string): PromoterActivityRecord[] {
  return [];
}
