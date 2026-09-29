import { describe, expect, it } from "vitest";
import {
  INSTITUTIONAL_BROKER_SOURCES,
  getCompanyConsensusIntelligence,
  getAllBrokerResearchReports,
} from "../database";

describe("Broker Research & Consensus Intelligence", () => {
  it("includes all 11 institutional broker desks requested by user prompt", () => {
    const requiredBrokers = [
      "Motilal Oswal",
      "ICICI Securities",
      "HDFC Securities",
      "Kotak Securities",
      "Axis Securities",
      "Emkay Global",
      "JM Financial",
      "Nuvama",
      "Prabhudas Lilladher",
      "Yes Securities",
      "IIFL Securities",
    ];

    const sourceNames = INSTITUTIONAL_BROKER_SOURCES.map((s) => s.broker);
    for (const broker of requiredBrokers) {
      expect(sourceNames).toContain(broker);
    }
    expect(INSTITUTIONAL_BROKER_SOURCES.length).toBe(11);
  });

  it("extracts institutional fields: broker, analyst, rating, target, previous, thesis, estimates, catalysts", () => {
    const reports = getAllBrokerResearchReports();
    expect(reports.length).toBeGreaterThan(0);

    const relianceMofsl = reports.find(
      (r) => r.symbol === "RELIANCE" && r.broker === "Motilal Oswal"
    );
    expect(relianceMofsl).toBeDefined();
    expect(relianceMofsl?.rating).toBe("BUY");
    expect(relianceMofsl?.targetPrice).toBe(3650);
    expect(relianceMofsl?.previousTarget).toBe(3350);
    expect(relianceMofsl?.thesis).toContain("Jio");
    expect(relianceMofsl?.estimates.length).toBeGreaterThan(0);
    expect(relianceMofsl?.estimates[0].ebitdaInrCr).toBeGreaterThan(0);
    expect(relianceMofsl?.catalysts.length).toBeGreaterThan(0);
    expect(relianceMofsl?.keyRisks.length).toBeGreaterThan(0);
  });

  it("calculates consensus intelligence and Why Changed? synthesis for RELIANCE", () => {
    const consensus = getCompanyConsensusIntelligence("RELIANCE");
    expect(consensus.symbol).toBe("RELIANCE");
    expect(consensus.cmp).toBe(2980);
    expect(consensus.consensusTargetPrice).toBeGreaterThan(consensus.cmp);
    expect(consensus.targetPriceHigh).toBe(3650); // Motilal Oswal
    expect(consensus.brokerHigh).toBe("Motilal Oswal");
    expect(consensus.targetPriceLow).toBe(3050); // Kotak Securities
    expect(consensus.brokerLow).toBe("Kotak Securities");

    // Check Why Changed? synthesis
    const why = consensus.whyChanged;
    expect(why).toBeDefined();
    expect(why.netTargetShiftPct).toBe(8.4);
    expect(why.drivers.length).toBeGreaterThanOrEqual(3);
    expect(why.skepticView).toContain("Kotak");
    expect(why.consensusInflectionVerdict).toBe("STRONG_BULLISH_RERATING");
  });

  it("generates structured fallback consensus for unseeded symbols", () => {
    const tcsConsensus = getCompanyConsensusIntelligence("TCS");
    expect(tcsConsensus.symbol).toBe("TCS");
    expect(tcsConsensus.consensusTargetPrice).toBeGreaterThan(0);
    expect(tcsConsensus.brokerMatrix.length).toBe(11);
    expect(tcsConsensus.whyChanged.drivers.length).toBeGreaterThan(0);
  });
});
