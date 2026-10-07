import { describe, expect, it } from "vitest";
import { panelSource, urlForSource } from "@/lib/panel-sources";

describe("panel source registry", () => {
  it("covers the research-page panels that declare no trust of their own", () => {
    for (const t of ["Quote & depth", "Session", "Fundamentals (Upstox key ratios)", "SEC filings", "Options Positioning (F&O)", "Who owns it", "What moves this stock"]) {
      const s = panelSource(t);
      expect(s, t).not.toBeNull();
      expect(s!.method.length).toBeGreaterThan(20);
    }
  });
  it("resolves a verifiable URL for common providers", () => {
    expect(urlForSource("NSE shareholding pattern filings (XBRL)")).toContain("nseindia.com");
    expect(urlForSource("SEC EDGAR")).toContain("sec.gov");
    expect(urlForSource("Unknown vendor")).toBeUndefined();
  });
});
