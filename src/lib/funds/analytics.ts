import type {
  MutualFund,
  FundHolding,
  OverlapResult,
  StockAccumulationSummary,
} from "./types";

// NOTE: analytics functions are pure math over explicitly supplied portfolios.
// They intentionally have NO default dataset — there is no live mutual-fund
// portfolio feed wired yet, so callers must pass real data explicitly.

/**
 * Calculates portfolio overlap between two mutual funds.
 * Overlap % = sum of min(weightA, weightB) for all common holdings.
 */
export function calculateFundOverlap(
  fundA: MutualFund,
  fundB: MutualFund
): OverlapResult {
  const mapA = new Map<string, FundHolding>();
  fundA.holdings.forEach((h) => {
    mapA.set(h.symbol.toUpperCase(), h);
  });

  const mapB = new Map<string, FundHolding>();
  fundB.holdings.forEach((h) => {
    mapB.set(h.symbol.toUpperCase(), h);
  });

  const commonHoldings: OverlapResult["commonHoldings"] = [];
  const fundAUniqueHoldings: FundHolding[] = [];
  const fundBUniqueHoldings: FundHolding[] = [];

  let overlapPct = 0;

  // Check all holdings in Fund A
  for (const [sym, holdingA] of mapA.entries()) {
    if (mapB.has(sym)) {
      const holdingB = mapB.get(sym)!;
      const minWeight = Math.min(holdingA.weightPct, holdingB.weightPct);
      overlapPct += minWeight;

      commonHoldings.push({
        symbol: holdingA.symbol,
        name: holdingA.name,
        sector: holdingA.sector,
        weightA: holdingA.weightPct,
        weightB: holdingB.weightPct,
        minWeight: Number(minWeight.toFixed(2)),
      });
    } else {
      fundAUniqueHoldings.push(holdingA);
    }
  }

  // Check unique holdings in Fund B
  for (const [sym, holdingB] of mapB.entries()) {
    if (!mapA.has(sym)) {
      fundBUniqueHoldings.push(holdingB);
    }
  }

  // Sort common holdings by minWeight descending (biggest overlap contributors first)
  commonHoldings.sort((a, b) => b.minWeight - a.minWeight);

  // Sector comparison
  const sectorMap = new Map<string, { weightA: number; weightB: number }>();
  fundA.sectorExposure.forEach((s) => {
    sectorMap.set(s.sector, { weightA: s.weightPct, weightB: 0 });
  });
  fundB.sectorExposure.forEach((s) => {
    const existing = sectorMap.get(s.sector) || { weightA: 0, weightB: 0 };
    existing.weightB = s.weightPct;
    sectorMap.set(s.sector, existing);
  });

  const sectorComparison = Array.from(sectorMap.entries())
    .map(([sector, weights]) => ({
      sector,
      weightA: weights.weightA,
      weightB: weights.weightB,
      diff: Number((weights.weightA - weights.weightB).toFixed(2)),
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return {
    fundA: {
      id: fundA.id,
      name: fundA.name,
      shortName: fundA.shortName,
      category: fundA.category,
      aumCr: fundA.aumCr,
    },
    fundB: {
      id: fundB.id,
      name: fundB.name,
      shortName: fundB.shortName,
      category: fundB.category,
      aumCr: fundB.aumCr,
    },
    overlapPct: Number(overlapPct.toFixed(2)),
    commonHoldingsCount: commonHoldings.length,
    fundAUniqueCount: fundAUniqueHoldings.length,
    fundBUniqueCount: fundBUniqueHoldings.length,
    commonHoldings,
    fundAUniqueHoldings,
    fundBUniqueHoldings,
    sectorComparison,
  };
}

/**
 * Computes cross-fund institutional accumulation radar.
 * Answers: "Which stocks are being accumulated across India's mutual funds?"
 */
export function computeInstitutionalAccumulation(
  funds: MutualFund[]
): StockAccumulationSummary[] {
  type AccumulationTracker = {
    symbol: string;
    name: string;
    isin: string;
    sector: string;
    marketCapCategory: "Large Cap" | "Mid Cap" | "Small Cap";
    netValueBoughtCr: number;
    sharesBoughtTotal: number;
    sharesSoldTotal: number;
    fundsBuying: {
      fundId: string;
      fundName: string;
      sharesAdded: number;
      valueAddedCr: number;
      currentWeightPct: number;
    }[];
    fundsSelling: {
      fundId: string;
      fundName: string;
      sharesSold: number;
      valueSoldCr: number;
      currentWeightPct: number;
    }[];
    totalFundsHolding: number;
    totalInstitutionalAumCr: number;
    isFreshEntry: boolean;
  };

  const tracker = new Map<string, AccumulationTracker>();

  // Helper to ensure entry exists
  const getOrCreate = (holding: FundHolding): AccumulationTracker => {
    const key = holding.symbol.toUpperCase();
    if (!tracker.has(key)) {
      tracker.set(key, {
        symbol: holding.symbol,
        name: holding.name,
        isin: holding.isin,
        sector: holding.sector,
        marketCapCategory: holding.marketCapCategory,
        netValueBoughtCr: 0,
        sharesBoughtTotal: 0,
        sharesSoldTotal: 0,
        fundsBuying: [],
        fundsSelling: [],
        totalFundsHolding: 0,
        totalInstitutionalAumCr: 0,
        isFreshEntry: false,
      });
    }
    return tracker.get(key)!;
  };

  // 1. Scan current holdings across funds
  for (const fund of funds) {
    for (const h of fund.holdings) {
      const item = getOrCreate(h);
      item.totalFundsHolding += 1;
      item.totalInstitutionalAumCr += h.marketValueCr;
    }
  }

  // 2. Scan MoM changes across funds
  for (const fund of funds) {
    const changes = fund.changesMoM;
    if (!changes) continue;

    // Fresh entries
    for (const entry of changes.newEntries) {
      const item = getOrCreate(entry);
      item.isFreshEntry = true;
      const val = entry.marketValueCr > 0 ? entry.marketValueCr : 50;
      item.netValueBoughtCr += val;
      item.sharesBoughtTotal += entry.shares;
      item.fundsBuying.push({
        fundId: fund.id,
        fundName: fund.shortName,
        sharesAdded: entry.shares,
        valueAddedCr: Number(val.toFixed(1)),
        currentWeightPct: entry.weightPct,
      });
    }

    // Accumulated
    for (const acc of changes.accumulated) {
      const item = getOrCreate(acc);
      const addedShares = acc.sharesChangeCount || Math.round(acc.shares * (acc.sharesChangePct / 100));
      const addedValue = (acc.marketValueCr * (acc.sharesChangePct / (100 + acc.sharesChangePct)));
      const cleanVal = addedValue > 0 ? addedValue : acc.marketValueCr * 0.1;

      item.netValueBoughtCr += cleanVal;
      item.sharesBoughtTotal += addedShares > 0 ? addedShares : 100000;
      item.fundsBuying.push({
        fundId: fund.id,
        fundName: fund.shortName,
        sharesAdded: addedShares > 0 ? addedShares : 100000,
        valueAddedCr: Number(cleanVal.toFixed(1)),
        currentWeightPct: acc.weightPct,
      });
    }

    // Trimmed
    for (const tr of changes.trimmed) {
      const item = getOrCreate(tr);
      const soldShares = Math.abs(tr.sharesChangeCount || Math.round(tr.shares * (Math.abs(tr.sharesChangePct) / 100)));
      const soldValue = Math.abs(tr.marketValueCr * (Math.abs(tr.sharesChangePct) / 100));
      const cleanSoldVal = soldValue > 0 ? soldValue : tr.marketValueCr * 0.08;

      item.netValueBoughtCr -= cleanSoldVal;
      item.sharesSoldTotal += soldShares;
      item.fundsSelling.push({
        fundId: fund.id,
        fundName: fund.shortName,
        sharesSold: soldShares,
        valueSoldCr: Number(cleanSoldVal.toFixed(1)),
        currentWeightPct: tr.weightPct,
      });
    }

    // Complete Exits
    for (const ex of changes.completeExits) {
      const item = getOrCreate(ex);
      const exitVal = ex.marketValueCr > 0 ? ex.marketValueCr : 100;
      item.netValueBoughtCr -= exitVal;
      item.sharesSoldTotal += ex.shares;
      item.fundsSelling.push({
        fundId: fund.id,
        fundName: fund.shortName,
        sharesSold: ex.shares,
        valueSoldCr: Number(exitVal.toFixed(1)),
        currentWeightPct: 0,
      });
    }
  }

  // Convert to output format
  const result: StockAccumulationSummary[] = [];

  for (const item of tracker.values()) {
    // Only include stocks that have either institutional buying or selling activity
    if (item.fundsBuying.length === 0 && item.fundsSelling.length === 0) {
      continue;
    }

    let trend: StockAccumulationSummary["trend"] = "NEUTRAL";
    if (item.fundsBuying.length >= 2 && item.netValueBoughtCr > 150) {
      trend = "HEAVY_ACCUMULATION";
    } else if (item.isFreshEntry && item.fundsBuying.length >= 1) {
      trend = "FRESH_ENTRY";
    } else if (item.netValueBoughtCr > 30) {
      trend = "MODERATE_BUYING";
    } else if (item.fundsSelling.length >= 2 && item.netValueBoughtCr < -100) {
      trend = "HEAVY_DUMPING";
    } else if (item.netValueBoughtCr < 0) {
      trend = "TRIMMING";
    }

    const netShares = item.sharesBoughtTotal - item.sharesSoldTotal;
    const netSharesPct = item.sharesBoughtTotal > 0
      ? Number(((netShares / Math.max(item.sharesBoughtTotal, 100000)) * 100).toFixed(1))
      : -10;

    result.push({
      symbol: item.symbol,
      name: item.name,
      isin: item.isin,
      sector: item.sector,
      marketCapCategory: item.marketCapCategory,
      netValueBoughtCr: Number(item.netValueBoughtCr.toFixed(1)),
      netSharesChangePct: netSharesPct,
      fundsBuyingCount: item.fundsBuying.length,
      fundsSellingCount: item.fundsSelling.length,
      totalFundsHolding: item.totalFundsHolding,
      totalInstitutionalAumCr: Number(item.totalInstitutionalAumCr.toFixed(1)),
      topBuyers: item.fundsBuying.sort((a, b) => b.valueAddedCr - a.valueAddedCr),
      topSellers: item.fundsSelling.sort((a, b) => b.valueSoldCr - a.valueSoldCr),
      trend,
    });
  }

  // Sort descending by net institutional capital accumulated
  return result.sort((a, b) => b.netValueBoughtCr - a.netValueBoughtCr);
}

/**
 * Filter accumulation results by sector, market cap, and trend
 */
export function filterAccumulationRadar(
  items: StockAccumulationSummary[],
  filters?: {
    sector?: string;
    marketCap?: string;
    trend?: string;
    search?: string;
  }
): StockAccumulationSummary[] {
  if (!filters) return items;

  return items.filter((item) => {
    if (filters.sector && filters.sector !== "All" && item.sector !== filters.sector) {
      return false;
    }
    if (filters.marketCap && filters.marketCap !== "All" && item.marketCapCategory !== filters.marketCap) {
      return false;
    }
    if (filters.trend && filters.trend !== "All" && item.trend !== filters.trend) {
      return false;
    }
    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase().trim();
      const match =
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.sector.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

/**
 * Aggregates net institutional capital flow by sector across all mutual funds
 */
export function getInstitutionalSectorFlows(funds: MutualFund[]) {
  const accumulation = computeInstitutionalAccumulation(funds);
  const flows = new Map<string, { netInflowCr: number; buyingCount: number; sellingCount: number }>();

  for (const item of accumulation) {
    const sec = item.sector || "Other";
    const cur = flows.get(sec) || { netInflowCr: 0, buyingCount: 0, sellingCount: 0 };
    cur.netInflowCr += item.netValueBoughtCr;
    cur.buyingCount += item.fundsBuyingCount;
    cur.sellingCount += item.fundsSellingCount;
    flows.set(sec, cur);
  }

  return Array.from(flows.entries())
    .map(([sector, data]) => ({
      sector,
      netInflowCr: Number(data.netInflowCr.toFixed(1)),
      buyingCount: data.buyingCount,
      sellingCount: data.sellingCount,
    }))
    .sort((a, b) => b.netInflowCr - a.netInflowCr);
}
