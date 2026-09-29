import { describe, expect, it } from "vitest";
import {
  creditAgencyPortalUrl,
  creditEventVerificationLink,
  nseCorporateFilingsUrl,
  promoterActivityVerificationLinks,
  regulationPortalUrl,
} from "@/lib/intelligence/verification-links";
import type { PromoterActivityRecord } from "@/lib/promoters/types";

describe("verification-links", () => {
  it("maps credit agencies to public rating portals", () => {
    expect(creditAgencyPortalUrl("CRISIL")).toContain("crisilratings.com");
    expect(creditAgencyPortalUrl("ICRA")).toContain("icra.in");
  });

  it("prefers explicit rating release URL for credit events", () => {
    const link = creditEventVerificationLink({
      symbol: "BHARTIARTL",
      agency: "CRISIL",
      sourceUrl: "https://www.crisilratings.com/example",
      actionDate: "2026-09-10",
    });
    expect(link.href).toBe("https://www.crisilratings.com/example");
    expect(link.label).toContain("2026-09-10");
  });

  it("builds NSE filings URL for a symbol", () => {
    expect(nseCorporateFilingsUrl("tmcv")).toContain("symbol=TMCV");
  });

  it("routes promoter checks to exchange regulatory portals", () => {
    expect(regulationPortalUrl("NSE Block Window")).toContain("block-deal");
  });

  it("returns promoter verification links with NSE filings fallback", () => {
    const act: PromoterActivityRecord = {
      id: "x",
      symbol: "INFY",
      companyName: "Infosys",
      sector: "IT",
      category: "INSIDER_SELLING",
      transactionDate: "2026-09-01",
      reportingDate: "2026-09-02",
      personName: "Director",
      personCategory: "Director / KMP",
      sharesCount: 1000,
      transactionPriceInr: 1500,
      transactionValueCr: 1,
      stakePctBefore: 0.1,
      stakePctAfter: 0.09,
      stakePctChange: -0.01,
      exchange: "NSE",
      sourceRegulation: "SEBI PIT Reg 7(2)",
      riskImpact: "BEARISH_DILUTION",
      rationale: "Test",
    };
    const links = promoterActivityVerificationLinks("INFY", [act], "INSIDER_SELLING");
    expect(links.some((l) => l.href.includes("INFY"))).toBe(true);
    expect(links.some((l) => l.label.includes("NSE"))).toBe(true);
  });
});
