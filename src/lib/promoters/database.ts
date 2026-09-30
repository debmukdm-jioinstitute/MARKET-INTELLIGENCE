import type { PromoterActivityRecord } from "./types";

export const PROMOTER_ACTIVITIES_STORE: PromoterActivityRecord[] = [
  // Seeded disclosure records were purged: they were fabricated. The feed
  // stays empty until a real promoter-disclosure source is wired.
];

/** "UNAVAILABLE" until a live promoter-disclosure feed is connected. */
export const PROMOTER_DATA_STATUS = "UNAVAILABLE" as const;

export function getAllPromoterActivities(): PromoterActivityRecord[] {
  return PROMOTER_ACTIVITIES_STORE;
}

export function filterPromoterActivities(filters?: {
  category?: string;
  sector?: string;
  symbol?: string;
  riskImpact?: string;
  search?: string;
}): PromoterActivityRecord[] {
  if (!filters) return PROMOTER_ACTIVITIES_STORE;

  return PROMOTER_ACTIVITIES_STORE.filter((item) => {
    if (filters.category && filters.category !== "ALL" && item.category !== filters.category) {
      return false;
    }
    if (filters.sector && filters.sector !== "ALL" && item.sector !== filters.sector) {
      return false;
    }
    if (filters.symbol && filters.symbol.trim() !== "" && item.symbol.toUpperCase() !== filters.symbol.toUpperCase()) {
      return false;
    }
    if (filters.riskImpact && filters.riskImpact !== "ALL" && item.riskImpact !== filters.riskImpact) {
      return false;
    }
    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase().trim();
      const match =
        item.symbol.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.personName.toLowerCase().includes(q) ||
        item.sector.toLowerCase().includes(q) ||
        item.rationale.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export function getPromoterActivitiesBySymbol(symbol: string): PromoterActivityRecord[] {
  const s = symbol.toUpperCase().trim();
  return PROMOTER_ACTIVITIES_STORE.filter((a) => a.symbol.toUpperCase() === s);
}
