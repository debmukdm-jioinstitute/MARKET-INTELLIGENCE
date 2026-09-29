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

  it("builds buyback and OFS detail links (OFS slug field is lowercase)", () => {
    const buyback = parseChittorgarhReportPayload(
      "buyback",
      {
        reportTableData: [
          {
            "~id": 247,
            "Company Name": "Emami Ltd.",
            "~URLRewrite_Folder_Name": "emami-buyback-2026",
          },
        ],
      },
      2026,
    );
    expect(buyback.rows[0]?.detailUrl).toBe("https://www.chittorgarh.com/buyback/emami-buyback-2026/247/");

    const ofs = parseChittorgarhReportPayload(
      "ofs",
      {
        reportTableData: [
          {
            "~id": 65,
            "~urlrewrite_folder_name": "sustainable-energy-infra-trust-ofs-september-2026",
            "Company Name": "Sustainable Energy Infra Trust",
          },
        ],
      },
      2026,
    );
    expect(ofs.rows[0]?.detailUrl).toBe(
      "https://www.chittorgarh.com/ofs/sustainable-energy-infra-trust-ofs-september-2026/65/",
    );

    const ncdSub = parseChittorgarhReportPayload(
      "ncd-subscription",
      {
        reportTableData: [
          {
            "~id": 396,
            "Company Name": "Edelweiss Financial Services Ltd.",
            "~URLRewrite_Folder_Name": "edelweiss-financial-services-ncd-september-2026",
          },
        ],
      },
      2026,
    );
    expect(ncdSub.rows[0]?.detailUrl).toContain("/ncd/edelweiss-financial-services-ncd-september-2026/396/");
  });
});
