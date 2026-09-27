import { INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import type { FnoIndexId } from "@/lib/scanner/fno-indices";

/** Map AI Signals F&O index → Upstox option chain + spread width (index points). */
export function optionContextForFnoIndex(indexId: FnoIndexId): {
  underlyingKey: string;
  label: string;
  lotSize: number;
  wingWidth: number;
} | null {
  switch (indexId) {
    case "nifty50":
      return { underlyingKey: INDIA_INDEX_INSTRUMENT_KEYS.NIFTY, label: "NIFTY", lotSize: 25, wingWidth: 100 };
    case "banknifty":
      return { underlyingKey: INDIA_INDEX_INSTRUMENT_KEYS.BANKNIFTY, label: "BANKNIFTY", lotSize: 15, wingWidth: 200 };
    case "finnifty":
      return { underlyingKey: INDIA_INDEX_INSTRUMENT_KEYS.FINNIFTY, label: "FINNIFTY", lotSize: 25, wingWidth: 100 };
    default:
      return null;
  }
}

export function leanToBias(call: "Bullish" | "Bearish" | "Neutral"): "bullish" | "bearish" | "neutral" {
  if (call === "Bullish") return "bullish";
  if (call === "Bearish") return "bearish";
  return "neutral";
}

/** Pick expiry with DTE in [minDte, maxDte], prefer ~45 days. */
export function pickExpiryForTheta(expiries: string[], minDte = 21, maxDte = 60): string | null {
  if (!expiries.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scored = expiries
    .map((e) => {
      const d = new Date(e);
      const dte = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      return { e, dte };
    })
    .filter((x) => x.dte >= minDte && x.dte <= maxDte);
  const pool = scored.length ? scored : expiries.map((e) => ({ e, dte: 45 }));
  pool.sort((a, b) => Math.abs(a.dte - 45) - Math.abs(b.dte - 45));
  return pool[0]?.e ?? null;
}
