import type { OptionChainSnapshot } from "@/lib/feeds/derivatives/types";
import type { ChainRow } from "./strategy-recommender";

const MIN_VOLUME = 10;
const MIN_OI = 50;

function midPremium(bid: number, ask: number, ltp: number): number {
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  if (ltp > 0) return ltp;
  if (bid > 0 || ask > 0) return Math.max(bid, ask);
  return 0;
}

/** Flatten Upstox chain → OptionStrat-style rows with liquidity filter. */
export function chainRowsFromSnapshot(snapshot: OptionChainSnapshot, expiry: string): ChainRow[] {
  const rows: ChainRow[] = [];
  for (const r of snapshot.rows) {
    if (r.call) {
      const c = r.call;
      if (c.volume >= MIN_VOLUME && c.oi >= MIN_OI) {
        rows.push({
          strike: r.strike,
          optionType: "call",
          expiration: expiry,
          bid: c.bidPrice,
          ask: c.askPrice,
          lastPrice: c.ltp,
          delta: c.greeks.delta,
          volume: c.volume,
          openInterest: c.oi,
          iv: c.greeks.iv,
        });
      }
    }
    if (r.put) {
      const p = r.put;
      if (p.volume >= MIN_VOLUME && p.oi >= MIN_OI) {
        rows.push({
          strike: r.strike,
          optionType: "put",
          expiration: expiry,
          bid: p.bidPrice,
          ask: p.askPrice,
          lastPrice: p.ltp,
          delta: p.greeks.delta,
          volume: p.volume,
          openInterest: p.oi,
          iv: p.greeks.iv,
        });
      }
    }
  }
  for (const row of rows) {
    row.mid_price = midPremium(row.bid, row.ask, row.lastPrice);
  }
  return rows;
}
