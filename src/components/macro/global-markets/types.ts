import type { WorldIndexQuote } from "@/lib/macro/build-world-indices";
import type { IndexFocusFilter } from "@/lib/macro/indices-universe";

export type { WorldIndexQuote, IndexFocusFilter };

export type GlobalMarketsTab = "americas" | "europe" | "asia" | "india" | "volatility" | "all";

export type SortColumn = "index" | "price" | "changePct";
export type SortDirection = "asc" | "desc" | null;

export type TableFilter = "all" | "watchlist";

export type RangePosition = {
  valid: boolean;
  pct: number | null;
  isOutside: boolean;
};
