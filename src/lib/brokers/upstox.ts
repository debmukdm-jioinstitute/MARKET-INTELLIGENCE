import { enrichHolding, parseCSVLine } from "@/lib/brokers/common";
import type { Holding } from "@/lib/my-portfolio/types";

export type UpstoxRawHolding = {
  isin?: string;
  company_name?: string;
  quantity: number;
  t1_quantity?: number;
  average_price: number;
  trading_symbol: string;
  last_price?: number;
  close_price?: number;
  pnl?: number;
};

/**
 * Fetches user holdings directly from Upstox API v2.
 * Endpoint: GET https://api.upstox.com/v2/portfolio/long-term-holdings
 */
export async function fetchUpstoxHoldings(accessToken: string): Promise<Holding[]> {
  const url = "https://api.upstox.com/v2/portfolio/long-term-holdings";

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken.trim()}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.errors?.[0]?.message) {
        errorDetail = errJson.errors[0].message;
      } else if (errJson?.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`Upstox API returned error: ${errorDetail}`);
  }

  const json = (await response.json()) as {
    status: string;
    data: UpstoxRawHolding[];
  };

  if (!json || json.status !== "success" || !Array.isArray(json.data)) {
    throw new Error("Invalid response format from Upstox API.");
  }

  const holdings: Holding[] = [];

  json.data.forEach((item, idx) => {
    const qty = (Number(item.quantity) || 0) + (Number(item.t1_quantity) || 0);
    const avgCost = Number(item.average_price || 0);

    if (item.trading_symbol && qty > 0 && avgCost > 0) {
      holdings.push(
        enrichHolding(item.trading_symbol, item.isin, qty, avgCost, idx, "upstox")
      );
    }
  });

  return holdings;
}

/**
 * Parses Upstox holding export CSVs.
 * Columns usually include: Trading Symbol, ISIN, Quantity, Average Price.
 */
export function parseUpstoxCSV(csvText: string): Holding[] {
  if (!csvText || typeof csvText !== "string") return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  const headerCols = parseCSVLine(lines[0]!).map((h) => h.toLowerCase());

  const symbolIdx = headerCols.findIndex(
    (h) =>
      h.includes("symbol") ||
      h.includes("trading") ||
      h.includes("instrument") ||
      h === "stock"
  );
  const isinIdx = headerCols.findIndex((h) => h.includes("isin"));
  const qtyIdx = headerCols.findIndex(
    (h) =>
      h.includes("qty") ||
      h.includes("quantity") ||
      h.includes("shares")
  );
  const costIdx = headerCols.findIndex(
    (h) =>
      h.includes("avg") ||
      h.includes("cost") ||
      h.includes("price") ||
      h.includes("rate")
  );

  if (symbolIdx === -1 || qtyIdx === -1 || costIdx === -1) {
    throw new Error(
      "Unrecognized Upstox CSV format. Headers must include Symbol/Trading Symbol, Quantity, and Avg Cost."
    );
  }

  const holdings: Holding[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]!);
    if (cols.length <= Math.max(symbolIdx, qtyIdx, costIdx)) continue;

    const rawSymbol = cols[symbolIdx];
    const rawIsin = isinIdx !== -1 ? cols[isinIdx] : undefined;
    const rawQty = cols[qtyIdx]?.replace(/,/g, "");
    const rawCost = cols[costIdx]?.replace(/,/g, "");

    const shares = parseFloat(rawQty || "0");
    const avgCost = parseFloat(rawCost || "0");

    if (rawSymbol && Number.isFinite(shares) && shares > 0 && Number.isFinite(avgCost) && avgCost > 0) {
      holdings.push(enrichHolding(rawSymbol, rawIsin, shares, avgCost, i, "upstox"));
    }
  }

  return holdings;
}
