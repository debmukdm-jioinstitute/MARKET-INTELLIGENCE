import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import type { Holding } from "@/lib/my-portfolio/types";

export type KiteRawHolding = {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  t1_quantity?: number;
  average_price: number;
  last_price?: number;
  close_price?: number;
  pnl?: number;
};

/**
 * Normalizes ticker symbol and enriches with name, sector, and instrument key.
 */
export function enrichHolding(
  rawSymbol: string,
  isin: string | null | undefined,
  shares: number,
  avgCost: number,
  index: number
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
    id: `zrd-${cleanSymbol}-${Date.now()}-${index}`,
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
 * Fetches user holdings directly from Zerodha Kite Connect API.
 * Endpoint: GET https://api.kite.trade/portfolio/holdings
 */
export async function fetchKiteHoldings(
  apiKey: string,
  accessToken: string
): Promise<Holding[]> {
  const url = "https://api.kite.trade/portfolio/holdings";

  const response = await fetch(url, {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey.trim()}:${accessToken.trim()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) errorDetail = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(`Zerodha Kite API returned error: ${errorDetail}`);
  }

  const data = (await response.json()) as {
    status: string;
    data: KiteRawHolding[];
    message?: string;
  };

  if (!data || data.status !== "success" || !Array.isArray(data.data)) {
    throw new Error(data?.message || "Invalid response format from Kite Connect");
  }

  const holdings: Holding[] = [];

  data.data.forEach((item, idx) => {
    const totalQty = (item.quantity || 0) + (item.t1_quantity || 0);
    const avgCost = Number(item.average_price || 0);

    if (item.tradingsymbol && totalQty > 0 && avgCost > 0) {
      holdings.push(
        enrichHolding(item.tradingsymbol, item.isin, totalQty, avgCost, idx)
      );
    }
  });

  return holdings;
}

/**
 * Robust parser for Zerodha Console CSV exports.
 * Typically columns: Instrument, ISIN, Quantity (or Qty.), Avg. cost, ...
 */
export function parseZerodhaCSV(csvText: string): Holding[] {
  if (!csvText || typeof csvText !== "string") return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  // Parse CSV line accounting for potential quotes
  const parseLine = (text: string): string[] => {
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
  };

  const headerCols = parseLine(lines[0]!).map((h) => h.toLowerCase());

  // Find column indexes
  const symbolIdx = headerCols.findIndex(
    (h) =>
      h === "instrument" ||
      h === "symbol" ||
      h === "tradingsymbol" ||
      h.includes("instrument")
  );
  const isinIdx = headerCols.findIndex((h) => h === "isin" || h.includes("isin"));
  const qtyIdx = headerCols.findIndex(
    (h) =>
      h === "qty." ||
      h === "qty" ||
      h === "quantity" ||
      h.includes("qty") ||
      h.includes("quantity")
  );
  const costIdx = headerCols.findIndex(
    (h) =>
      h === "avg. cost" ||
      h === "avg cost" ||
      h === "average price" ||
      h === "buy avg" ||
      h.includes("avg") ||
      h.includes("cost")
  );

  if (symbolIdx === -1 || qtyIdx === -1 || costIdx === -1) {
    throw new Error(
      "Unrecognized CSV format. Headers must include Instrument/Symbol, Quantity, and Avg Cost."
    );
  }

  const holdings: Holding[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]!);
    if (cols.length <= Math.max(symbolIdx, qtyIdx, costIdx)) continue;

    const rawSymbol = cols[symbolIdx];
    const rawIsin = isinIdx !== -1 ? cols[isinIdx] : undefined;
    const rawQty = cols[qtyIdx]?.replace(/,/g, "");
    const rawCost = cols[costIdx]?.replace(/,/g, "");

    const shares = parseFloat(rawQty || "0");
    const avgCost = parseFloat(rawCost || "0");

    if (rawSymbol && Number.isFinite(shares) && shares > 0 && Number.isFinite(avgCost) && avgCost > 0) {
      holdings.push(enrichHolding(rawSymbol, rawIsin, shares, avgCost, i));
    }
  }

  return holdings;
}
