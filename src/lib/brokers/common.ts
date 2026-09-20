import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import type { Holding } from "@/lib/my-portfolio/types";

/**
 * Common holding enrichment helper for Indian brokers (Zerodha, Dhan, Upstox).
 * Cleans symbols, enriches with official names, sectors, and exchange instrument keys.
 */
export function enrichHolding(
  rawSymbol: string,
  isin: string | null | undefined,
  shares: number,
  avgCost: number,
  index: number,
  brokerPrefix: string = "in"
): Holding {
  const cleanSymbol = rawSymbol
    .trim()
    .toUpperCase()
    .replace(/-EQ$/, "")
    .replace(/\.NS$/, "")
    .replace(/-BE$/, "");

  const matched = INDIA_EQUITIES.find(
    (e) =>
      e.symbol.toUpperCase() === cleanSymbol ||
      (isin && e.isin.toUpperCase() === isin.trim().toUpperCase())
  );

  const finalIsin = isin?.trim() || matched?.isin || null;
  const instrumentKey = finalIsin
    ? `NSE_EQ|${finalIsin}`
    : matched?.instrumentKey ?? null;

  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `${brokerPrefix}-${cleanSymbol}-${Date.now()}-${index}`,
    market: "IN",
    symbol: cleanSymbol,
    instrumentKey,
    name: matched?.name || cleanSymbol,
    sector: matched?.sector || null,
    currency: "INR",
    shares: Number(shares),
    avgCost: Number(avgCost),
    addedAt: today,
  };
}

/**
 * Standard CSV line parser that respects quoted commas.
 */
export function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ""));
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ""));
  return result;
}
