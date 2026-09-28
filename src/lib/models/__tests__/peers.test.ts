import { describe, expect, it } from "vitest";
import { getPeerCandidatesForSymbol } from "@/lib/models/peers";

describe("getPeerCandidatesForSymbol", () => {
  it("resolves Indian Banking peers for SBIN without cross-sector pollution (e.g. RELIANCE, LT)", () => {
    const { candidates, groupName } = getPeerCandidatesForSymbol("SBIN.NS");
    expect(groupName).toBe("Banking");
    expect(candidates).toContain("HDFCBANK.NS");
    expect(candidates).toContain("ICICIBANK.NS");
    expect(candidates).toContain("KOTAKBANK.NS");
    expect(candidates).toContain("AXISBANK.NS");
    expect(candidates).not.toContain("RELIANCE.NS");
    expect(candidates).not.toContain("LT.NS");
    expect(candidates).not.toContain("TCS.NS");
  });

  it("resolves Energy & Oil peers for RELIANCE without Banking or Capital Goods pollution", () => {
    const { candidates, groupName } = getPeerCandidatesForSymbol("RELIANCE.NS");
    expect(groupName).toBe("Oil, Gas & Energy");
    expect(candidates).toContain("ONGC.NS");
    expect(candidates).toContain("IOC.NS");
    expect(candidates).toContain("BPCL.NS");
    expect(candidates).not.toContain("SBIN.NS");
    expect(candidates).not.toContain("LT.NS");
  });

  it("resolves Capital Goods & Engineering peers for LT without Banking or Oil pollution", () => {
    const { candidates, groupName } = getPeerCandidatesForSymbol("LT.NS");
    expect(groupName).toBe("Capital Goods & Engineering");
    expect(candidates).toContain("SIEMENS.NS");
    expect(candidates).toContain("ABB.NS");
    expect(candidates).toContain("BHEL.NS");
    expect(candidates).not.toContain("SBIN.NS");
    expect(candidates).not.toContain("RELIANCE.NS");
  });

  it("resolves IT peers for TCS", () => {
    const { candidates, groupName } = getPeerCandidatesForSymbol("TCS.NS");
    expect(groupName).toBe("Information Technology");
    expect(candidates).toContain("INFY.NS");
    expect(candidates).toContain("HCLTECH.NS");
    expect(candidates).toContain("WIPRO.NS");
    expect(candidates).not.toContain("SBIN.NS");
  });

  it("resolves Big Tech peers for AAPL", () => {
    const { candidates, groupName } = getPeerCandidatesForSymbol("AAPL");
    expect(groupName).toBe("Big Tech & Software");
    expect(candidates).toContain("MSFT");
    expect(candidates).toContain("GOOGL");
    expect(candidates).toContain("AMZN");
  });

  it("resolves Banking peers for JPM", () => {
    const { candidates, groupName } = getPeerCandidatesForSymbol("JPM");
    expect(groupName).toBe("Banking & Financial Services");
    expect(candidates).toContain("BAC");
    expect(candidates).toContain("WFC");
    expect(candidates).toContain("C");
  });

  it("resolves same-sector NIFTY 500 peers for uncached stocks", () => {
    const { candidates, groupName } = getPeerCandidatesForSymbol("ZYDUSWELL.NS");
    expect(groupName).toBe("Fast Moving Consumer Goods");
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach((c) => expect(c.endsWith(".NS")).toBe(true));
  });
});
