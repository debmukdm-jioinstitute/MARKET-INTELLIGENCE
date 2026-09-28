import type { DepthLevel } from "./quotes";

type RawDepthRow = Record<string, unknown>;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function mapSide(rows: RawDepthRow[] | undefined): DepthLevel[] {
  if (!rows?.length) return [];
  return rows
    .map((r) => ({
      price: num(r.price ?? r.bid_price ?? r.ask_price ?? r.bid_p ?? r.ask_p),
      quantity: num(r.quantity ?? r.qty),
      orders: num(r.orders ?? r.no_of_orders ?? r.order),
    }))
    .filter((r) => r.price > 0 && r.quantity > 0);
}

/** Upstox depth when market closed is often all zeros — treat as unavailable. */
export function normalizeMarketDepth(raw: { buy?: RawDepthRow[]; sell?: RawDepthRow[] } | undefined): {
  buy: DepthLevel[];
  sell: DepthLevel[];
} {
  const buy = mapSide(raw?.buy);
  const sell = mapSide(raw?.sell);
  if (!buy.length && !sell.length) return { buy: [], sell: [] };
  return { buy, sell };
}

export function depthLooksAvailable(buy: DepthLevel[], sell: DepthLevel[]): boolean {
  const levels = [...buy, ...sell];
  return levels.some((l) => l.price > 0 && l.quantity > 0);
}
