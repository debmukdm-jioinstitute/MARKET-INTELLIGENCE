import { describe, expect, it } from "vitest";
import {
  classifyRegulator,
  extractFinancialExposure,
  isLegalRiskHeadline,
  newsToRiskCase,
} from "../classify";

describe("legal-risk classify", () => {
  it("flags insolvency and maps NCLT", () => {
    const title = "NCLT admits insolvency plea against XYZ Ltd under IBC";
    expect(isLegalRiskHeadline(title)).toBe(true);
    expect(classifyRegulator(title).monitorId).toBe("nclt");
  });

  it("extracts rupee exposure from headline", () => {
    const v = extractFinancialExposure("SEBI imposes ₹ 25 crore penalty on broker");
    expect(v).toMatch(/25 crore/i);
  });

  it("builds risk case chain from news item", () => {
    const c = newsToRiskCase(
      {
        id: "t1",
        source: "livemint",
        title: "SEBI orders ₹ 12 crore penalty on INFY subsidiary for disclosure lapse",
        link: "https://example.com/a",
        publishedAt: "2026-09-29T10:00:00Z",
      },
      [{ symbol: "INFY", name: "Infosys", instrumentKey: "x", isin: "y", sector: "IT" }],
    );
    expect(c?.company.symbol).toBe("INFY");
    expect(c?.regulator).toMatch(/SEBI/i);
    expect(c?.financialExposure).toBeTruthy();
  });
});
