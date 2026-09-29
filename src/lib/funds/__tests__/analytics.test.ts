import { describe, it, expect } from "vitest";
import {
  calculateFundOverlap,
  computeInstitutionalAccumulation,
  filterAccumulationRadar,
  getInstitutionalSectorFlows,
} from "../analytics";
import { MUTUAL_FUNDS_STORE, getMutualFundById } from "../database";

describe("Mutual Fund Analytics & Intelligence", () => {
  it("computes exact portfolio overlap between two mutual funds", () => {
    const ppfas = getMutualFundById("parag-parikh-flexi-cap");
    const iciciPru = getMutualFundById("icici-pru-bluechip");

    expect(ppfas).toBeDefined();
    expect(iciciPru).toBeDefined();

    if (!ppfas || !iciciPru) return;

    const overlap = calculateFundOverlap(ppfas, iciciPru);

    expect(overlap.overlapPct).toBeGreaterThan(15);
    expect(overlap.overlapPct).toBeLessThan(40);
    expect(overlap.commonHoldingsCount).toBeGreaterThan(0);

    // Common holdings should include large cap anchors like HDFC Bank and ICICI Bank
    const commonSymbols = overlap.commonHoldings.map((h) => h.symbol);
    expect(commonSymbols).toContain("HDFCBANK");
    expect(commonSymbols).toContain("ICICIBANK");

    // Overlap contribution should be min(weightA, weightB)
    const hdfc = overlap.commonHoldings.find((h) => h.symbol === "HDFCBANK");
    expect(hdfc).toBeDefined();
    if (hdfc) {
      expect(hdfc.minWeight).toBe(Math.min(hdfc.weightA, hdfc.weightB));
    }
  });

  it("calculates 100% overlap when comparing a fund with itself", () => {
    const ppfas = getMutualFundById("parag-parikh-flexi-cap")!;
    const selfOverlap = calculateFundOverlap(ppfas, ppfas);

    expect(selfOverlap.fundAUniqueCount).toBe(0);
    expect(selfOverlap.fundBUniqueCount).toBe(0);
    expect(selfOverlap.commonHoldingsCount).toBe(ppfas.holdings.length);
    // Overlap should equal sum of all weights in fund
    const totalWeight = ppfas.holdings.reduce((sum, h) => sum + h.weightPct, 0);
    expect(selfOverlap.overlapPct).toBeCloseTo(totalWeight, 1);
  });

  it("computes institutional accumulation radar across India mutual funds", () => {
    const accumulation = computeInstitutionalAccumulation(MUTUAL_FUNDS_STORE);

    expect(accumulation.length).toBeGreaterThan(10);

    // Should answer: Which stocks are being accumulated across India's mutual funds?
    const topAccumulated = accumulation[0];
    expect(topAccumulated.netValueBoughtCr).toBeGreaterThan(0);
    expect(topAccumulated.fundsBuyingCount).toBeGreaterThan(0);
    expect(topAccumulated.topBuyers.length).toBeGreaterThan(0);

    // Verify ZOMATO or TRENT are among top accumulated
    const symbols = accumulation.slice(0, 5).map((s) => s.symbol);
    expect(symbols.some((s) => s === "ZOMATO" || s === "TRENT" || s === "SUZLON")).toBe(true);

    // Verify buyer attribution
    const zomato = accumulation.find((s) => s.symbol === "ZOMATO");
    expect(zomato).toBeDefined();
    if (zomato) {
      expect(zomato.fundsBuyingCount).toBeGreaterThanOrEqual(2);
      expect(zomato.trend).toBe("HEAVY_ACCUMULATION");
    }
  });

  it("filters accumulation radar by sector and market cap", () => {
    const accumulation = computeInstitutionalAccumulation(MUTUAL_FUNDS_STORE);

    const midCapsOnly = filterAccumulationRadar(accumulation, { marketCap: "Mid Cap" });
    expect(midCapsOnly.length).toBeGreaterThan(0);
    expect(midCapsOnly.every((s) => s.marketCapCategory === "Mid Cap")).toBe(true);

    const searchResult = filterAccumulationRadar(accumulation, { search: "Zomato" });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].symbol).toBe("ZOMATO");
  });

  it("aggregates sector-wise institutional capital flows", () => {
    const flows = getInstitutionalSectorFlows(MUTUAL_FUNDS_STORE);
    expect(flows.length).toBeGreaterThan(0);

    const topSector = flows[0];
    expect(topSector.sector).toBeDefined();
    expect(topSector.netInflowCr).toBeGreaterThan(0);
  });
});
