import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseChittorgarhReportPayload } from "@/lib/feeds/sources/chittorgarh-report-api";

describe("chittorgarh report api", () => {
  it("parses NCD rows from reportTableData JSON", () => {
    const payload = JSON.parse(
      readFileSync(new URL("./fixtures/chittorgarh-ncd-report-sample.json", import.meta.url), "utf8"),
    );
    const report = parseChittorgarhReportPayload("ncd", payload, 2026);
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.rows[0]?.name).toContain("Edelweiss");
    expect(report.rows[0]?.fields["Opening Date"]).toBeTruthy();
    expect(report.rows[0]?.detailUrl).toContain("/ncd/");
  });
});
