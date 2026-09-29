import type { Holding } from "@/lib/my-portfolio/types";

export function holdingMatchKey(h: Pick<Holding, "market" | "symbol">): string {
  return `${h.market}:${h.symbol.toUpperCase()}`;
}

/** Weighted average cost when combining two lots of the same script. */
export function mergeAvgCost(
  sharesA: number,
  costA: number,
  sharesB: number,
  costB: number,
): number {
  const total = sharesA + sharesB;
  if (total <= 0) return costA;
  return (sharesA * costA + sharesB * costB) / total;
}

export function mergeTwoHoldings(existing: Holding, incoming: Holding): Holding {
  const shares = existing.shares + incoming.shares;
  const avgCost = mergeAvgCost(existing.shares, existing.avgCost, incoming.shares, incoming.avgCost);
  const addedAt = existing.addedAt <= incoming.addedAt ? existing.addedAt : incoming.addedAt;
  return {
    ...existing,
    shares,
    avgCost,
    addedAt,
    name: incoming.name || existing.name,
    sector: incoming.sector ?? existing.sector,
    instrumentKey: incoming.instrumentKey ?? existing.instrumentKey,
  };
}

/** Collapse duplicate symbols in arbitrary order (same market + ticker → one row). */
export function consolidateHoldings(holdings: Holding[]): Holding[] {
  let out: Holding[] = [];
  for (const h of holdings) {
    out = mergeHoldingIntoList(out, h).list;
  }
  return out;
}

export function mergeHoldingIntoList(
  holdings: Holding[],
  incoming: Holding,
): { list: Holding[]; result: Holding; merged: boolean } {
  const key = holdingMatchKey(incoming);
  const idx = holdings.findIndex((h) => holdingMatchKey(h) === key);
  if (idx < 0) {
    return { list: [...holdings, incoming], result: incoming, merged: false };
  }
  const result = mergeTwoHoldings(holdings[idx]!, incoming);
  const list = holdings.slice();
  list[idx] = result;
  return { list, result, merged: true };
}
