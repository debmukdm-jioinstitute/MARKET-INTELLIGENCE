import type { RangePosition, SortColumn, SortDirection, WorldIndexQuote } from "./types";

export function computeRangePosition(
  current: number | null,
  low: number | null,
  high: number | null
): RangePosition {
  if (
    current == null ||
    low == null ||
    high == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(low) ||
    !Number.isFinite(high)
  ) {
    return { valid: false, pct: null, isOutside: false };
  }

  if (high === low) {
    return { valid: true, pct: 50, isOutside: current !== low };
  }

  const isOutside = current < low || current > high;
  const raw = ((current - low) / (high - low)) * 100;
  const clamped = Math.min(100, Math.max(0, raw));

  return { valid: true, pct: clamped, isOutside };
}

export function formatLargeVolume(vol: number | null): { short: string; long: string } {
  if (vol == null || !Number.isFinite(vol) || vol <= 0) {
    return { short: "—", long: "Unavailable" };
  }
  if (vol >= 1e9) {
    const b = vol / 1e9;
    return { short: `${b.toFixed(2)}B`, long: `${b.toFixed(2)} billion` };
  }
  if (vol >= 1e6) {
    const m = vol / 1e6;
    return { short: `${m.toFixed(2)}M`, long: `${m.toFixed(2)} million` };
  }
  if (vol >= 1e3) {
    const k = vol / 1e3;
    return { short: `${k.toFixed(1)}K`, long: `${k.toFixed(1)} thousand` };
  }
  return { short: vol.toLocaleString("en-US"), long: vol.toLocaleString("en-US") };
}

export function formatPrice(price: number | null, decimals = 2): string {
  if (price == null || !Number.isFinite(price)) return "—";
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSignedPoints(change: number | null, decimals = 2): string {
  if (change == null || !Number.isFinite(change)) return "—";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  const abs = Math.abs(change).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${abs} points`;
}

export function formatSignedPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  const abs = (Math.abs(pct) * 100).toFixed(2);
  return `${sign}${abs}%`;
}

export type DirectionType = "up" | "down" | "flat" | "unavailable";

export function getDirection(change: number | null, changePct: number | null): DirectionType {
  const metric = change ?? changePct;
  if (metric == null || !Number.isFinite(metric)) return "unavailable";
  if (metric > 0) return "up";
  if (metric < 0) return "down";
  return "flat";
}

export function sortIndices(
  items: WorldIndexQuote[],
  column: SortColumn,
  direction: SortDirection
): WorldIndexQuote[] {
  if (!direction) return [...items];

  // Stable sort using original indices
  const indexed = items.map((item, idx) => ({ item, idx }));

  indexed.sort((a, b) => {
    let diff = 0;
    if (column === "index") {
      diff = a.item.label.localeCompare(b.item.label);
    } else if (column === "price") {
      const aVal = a.item.price;
      const bVal = b.item.price;
      if (aVal == null && bVal == null) diff = 0;
      else if (aVal == null) return 1; // nulls always at bottom
      else if (bVal == null) return -1;
      else diff = aVal - bVal;
    } else if (column === "changePct") {
      const aVal = a.item.changePct;
      const bVal = b.item.changePct;
      if (aVal == null && bVal == null) diff = 0;
      else if (aVal == null) return 1; // nulls always at bottom
      else if (bVal == null) return -1;
      else diff = aVal - bVal;
    }

    if (diff === 0) return a.idx - b.idx; // Stable tiebreaker
    return direction === "asc" ? diff : -diff;
  });

  return indexed.map((x) => x.item);
}
