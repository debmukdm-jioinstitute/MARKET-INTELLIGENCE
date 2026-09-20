import { enrichHolding, parseCSVLine } from "@/lib/brokers/common";
import type { Holding } from "@/lib/my-portfolio/types";

export type DhanRawHolding = {
  dhanClientId?: string;
  tradingSymbol: string;
  securityId?: string;
  isin?: string;
  totalQty: number;
  dpQty?: number;
  t1Qty?: number;
  availableQty?: number;
  avgCostPrice: number;
};

/**
 * Fetches user holdings directly from Dhan HQ API v2.
 * Endpoint: GET https://api.dhan.co/v2/holdings
 */
export async function fetchDhanHoldings(
  clientId: string,
  accessToken: string
): Promise<Holding[]> {
  const url = "https://api.dhan.co/v2/holdings";

  const response = await fetch(url, {
    headers: {
      "access-token": accessToken.trim(),
      "client-id": clientId.trim(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.errorMessage || errJson?.message) {
        errorDetail = errJson.errorMessage || errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`Dhan HQ API returned error: ${errorDetail}`);
  }

  const data = (await response.json()) as DhanRawHolding[];

  if (!Array.isArray(data)) {
    throw new Error("Invalid response format from Dhan HQ API.");
  }

  const holdings: Holding[] = [];

  data.forEach((item, idx) => {
    const qty = Number(item.totalQty || 0);
    const avgCost = Number(item.avgCostPrice || 0);

    if (item.tradingSymbol && qty > 0 && avgCost > 0) {
      holdings.push(enrichHolding(item.tradingSymbol, item.isin, qty, avgCost, idx, "dhan"));
    }
  });

  return holdings;
}

/**
 * Parses Dhan Web portal CSV exports.
 * Typical columns: Trading Symbol, ISIN, Total Qty, Avg Cost Price, etc.
 */
export function parseDhanCSV(csvText: string): Holding[] {
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
      h.includes("total")
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
      "Unrecognized Dhan CSV format. Headers must include Symbol/Trading Symbol, Quantity, and Avg Cost."
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
      holdings.push(enrichHolding(rawSymbol, rawIsin, shares, avgCost, i, "dhan"));
    }
  }

  return holdings;
}
