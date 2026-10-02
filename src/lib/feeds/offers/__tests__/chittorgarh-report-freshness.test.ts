import { describe, expect, it } from "vitest";
import {
  clearChittorgarhOfferCache,
  parseChittorgarhReportPayload,
} from "../../sources/chittorgarh-report-api";

describe("Chittorgarh Report Freshness & Parsing", () => {
  it("attaches live asOf ISO timestamp when parsing report payload", () => {
    const before = new Date().getTime();
    const payload = {
      reportTableData: [
        {
          "~id": "123",
          Company: "Test Finance Ltd.",
          "Opening Date": "01-Oct-2026",
          "Closing Date": "15-Oct-2026",
        },
      ],
    };
    const report = parseChittorgarhReportPayload("ncd", payload, 2026);
    const after = new Date().getTime();

    expect(report.category).toBe("ncd");
    expect(report.rows.length).toBe(1);
    expect(report.rows[0].name).toBe("Test Finance Ltd.");
    expect(report.source.provider).toBe("Chittorgarh");

    const asOfMs = new Date(report.source.asOf).getTime();
    expect(asOfMs).toBeGreaterThanOrEqual(before - 1000);
    expect(asOfMs).toBeLessThanOrEqual(after + 1000);
  });

  it("handles clearing specific category cache or all categories", () => {
    expect(() => clearChittorgarhOfferCache("ncd", 2026)).not.toThrow();
    expect(() => clearChittorgarhOfferCache("ncd-subscription")).not.toThrow();
    expect(() => clearChittorgarhOfferCache()).not.toThrow();
  });
});
