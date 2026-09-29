import { describe, expect, it } from "vitest";
import { deriveInstitutionalSignals, deriveSmartMoneyScore } from "../signals";

describe("institutional signals", () => {
  it("scores domestic absorption when DII and MF outweigh FII selling", () => {
    const score = deriveSmartMoneyScore({
      fiiToday: -1200,
      fiiM1: -9000,
      fiiYtd: -20000,
      diiToday: 1500,
      diiM1: 12000,
      mfNetCapitalCr: 1800,
      mfAccumulatingCount: 40,
      mfTrimmingCount: 12,
    });
    expect(score).toBeGreaterThan(20);

    const signals = deriveInstitutionalSignals({
      fiiToday: -1200,
      fiiM1: -9000,
      fiiYtd: -20000,
      diiToday: 1500,
      diiM1: 12000,
      mfNetCapitalCr: 1800,
      mfAccumulatingCount: 40,
      mfTrimmingCount: 12,
    });
    const smart = signals.find((s) => s.id === "smart_money_flow");
    expect(smart?.direction).toBe("up");
    const fii = signals.find((s) => s.id === "fii_ownership");
    expect(fii?.direction).toBe("down");
  });

  it("marks promoter and insider signals as na until filings feed ships", () => {
    const signals = deriveInstitutionalSignals({
      fiiToday: 0,
      fiiM1: 0,
      fiiYtd: 0,
      diiToday: 0,
      diiM1: 0,
      mfNetCapitalCr: 0,
      mfAccumulatingCount: 0,
      mfTrimmingCount: 0,
    });
    expect(signals.find((s) => s.id === "promoter_ownership")?.direction).toBe("na");
    expect(signals.find((s) => s.id === "insider_activity")?.direction).toBe("na");
  });
});
