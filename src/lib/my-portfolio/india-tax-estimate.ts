import type { Market, PositionRow, TradeLogRow } from "@/lib/my-portfolio/types";

/** Policy constants (India equity, illustrative FY25-style rules — not legal/tax advice). */
export const INDIA_TAX_RATES = {
  stcgRate: 0.2,
  ltcgRate: 0.125,
  ltcgAnnualExemptionInr: 125_000,
  ltcgHoldingDays: 365,
} as const;

export type TaxBucket = "STCG" | "LTCG" | "US_FOREIGN";

export type UnrealizedTaxRow = {
  symbol: string;
  name: string;
  market: Market;
  shares: number;
  holdingDays: number;
  bucket: TaxBucket;
  gainInr: number;
  estimatedTaxInr: number;
};

export type RealizedTaxRow = {
  symbol: string;
  side: "SELL";
  shares: number;
  sellPrice: number;
  costBasis: number;
  gainInr: number;
  tradeDate: string;
};

export type TaxSummary = {
  unrealizedRows: UnrealizedTaxRow[];
  realizedRows: RealizedTaxRow[];
  totalUnrealizedGainInr: number;
  totalRealizedGainInr: number;
  estimatedStcgTaxInr: number;
  estimatedLtcgTaxInr: number;
  ltcgExemptionAppliedInr: number;
  totalEstimatedTaxInr: number;
  fxRateUsed: number;
};

function daysBetween(startIso: string, end = new Date()): number {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (24 * 3600 * 1000)));
}

export function estimateIndiaPortfolioTax(input: {
  positions: PositionRow[];
  tradeLog: TradeLogRow[];
  avgCostBySymbol: Map<string, number>;
  addedAtBySymbol: Map<string, string>;
  fxRate: number;
}): TaxSummary {
  const { positions, tradeLog, avgCostBySymbol, addedAtBySymbol, fxRate } = input;
  const unrealizedRows: UnrealizedTaxRow[] = [];
  let stcgGain = 0;
  let ltcgGain = 0;

  for (const p of positions) {
    const gainInr = p.pnlInr;
    if (p.market === "US") {
      unrealizedRows.push({
        symbol: p.symbol,
        name: p.name,
        market: p.market,
        shares: p.shares,
        holdingDays: daysBetween(addedAtBySymbol.get(p.symbol.toUpperCase()) ?? new Date().toISOString().slice(0, 10)),
        bucket: "US_FOREIGN",
        gainInr,
        estimatedTaxInr: 0,
      });
      continue;
    }
    const addedAt = addedAtBySymbol.get(p.symbol.toUpperCase()) ?? new Date().toISOString().slice(0, 10);
    const holdingDays = daysBetween(addedAt);
    const bucket: TaxBucket = holdingDays > INDIA_TAX_RATES.ltcgHoldingDays ? "LTCG" : "STCG";
    if (gainInr > 0) {
      if (bucket === "STCG") stcgGain += gainInr;
      else ltcgGain += gainInr;
    }
    unrealizedRows.push({
      symbol: p.symbol,
      name: p.name,
      market: p.market,
      shares: p.shares,
      holdingDays,
      bucket,
      gainInr,
      estimatedTaxInr: 0,
    });
  }

  const realizedRows: RealizedTaxRow[] = [];
  let realizedGainInr = 0;
  for (const t of tradeLog.filter((x) => x.side === "SELL")) {
    const basis = avgCostBySymbol.get(t.symbol.toUpperCase()) ?? t.price;
    const gain = (t.price - basis) * t.shares;
    const gainInr = gain;
    realizedGainInr += gainInr;
    if (gainInr > 0) {
      stcgGain += gainInr;
    }
    realizedRows.push({
      symbol: t.symbol,
      side: "SELL",
      shares: t.shares,
      sellPrice: t.price,
      costBasis: basis,
      gainInr,
      tradeDate: t.date,
    });
  }

  const estimatedStcgTaxInr = Math.max(0, stcgGain) * INDIA_TAX_RATES.stcgRate;
  const ltcgExemptionAppliedInr = Math.min(Math.max(0, ltcgGain), INDIA_TAX_RATES.ltcgAnnualExemptionInr);
  const taxableLtcg = Math.max(0, ltcgGain - INDIA_TAX_RATES.ltcgAnnualExemptionInr);
  const estimatedLtcgTaxInr = taxableLtcg * INDIA_TAX_RATES.ltcgRate;

  for (const row of unrealizedRows) {
    if (row.gainInr <= 0 || row.bucket === "US_FOREIGN") continue;
    if (row.bucket === "STCG") {
      row.estimatedTaxInr = row.gainInr * INDIA_TAX_RATES.stcgRate;
    } else {
      row.estimatedTaxInr = 0;
    }
  }

  return {
    unrealizedRows: unrealizedRows.sort((a, b) => b.gainInr - a.gainInr),
    realizedRows: realizedRows.sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : -1)),
    totalUnrealizedGainInr: positions.reduce((s, p) => s + p.pnlInr, 0),
    totalRealizedGainInr: realizedGainInr,
    estimatedStcgTaxInr,
    estimatedLtcgTaxInr,
    ltcgExemptionAppliedInr,
    totalEstimatedTaxInr: estimatedStcgTaxInr + estimatedLtcgTaxInr,
    fxRateUsed: fxRate,
  };
}

export function exportHoldingsCsv(positions: PositionRow[]): string {
  const header = ["Symbol", "Market", "Name", "Shares", "AvgCost", "Last", "Currency", "DayPct", "MV_INR", "Weight", "UnrealizedPnl_INR"];
  const rows = positions.map((p) =>
    [
      p.symbol,
      p.market,
      `"${p.name.replace(/"/g, '""')}"`,
      p.shares,
      p.avgCost,
      p.last,
      p.currency,
      (p.dayPct * 100).toFixed(2),
      Math.round(p.marketValueInr),
      (p.weight * 100).toFixed(2),
      Math.round(p.pnlInr),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
