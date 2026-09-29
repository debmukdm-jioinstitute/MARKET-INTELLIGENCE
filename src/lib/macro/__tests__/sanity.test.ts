import { describe, expect, it } from "vitest";
import type { IndiaMacroHubPayload } from "@/lib/macro/types";
import { auditMacroHub, maxAgeDaysForMetric } from "@/lib/macro/sanity";

describe("macro sanity", () => {
  it("flags stale monthly series", () => {
    const payload = {
      fetchedAt: new Date().toISOString(),
      regime: { title: "", overall: "reflation", overallLabel: "", signals: [], history: [], growthInflationChart: [] },
      sections: {
        consumer: {
          id: "consumer",
          title: "",
          subtitle: "",
          highlights: [],
          metrics: [
            {
              id: "upi_volume",
              label: "UPI",
              value: 20,
              unit: "₹ L cr",
              history: [{ date: "2020-01", value: 10 }],
              source: { provider: "NPCI", url: "https://example.com", asOf: "2020-01-15" },
            },
          ],
        },
      },
    } as unknown as IndiaMacroHubPayload;

    const report = auditMacroHub(payload, Date.parse("2026-09-29T00:00:00.000Z"));
    const consumer = report.sections.find((s) => s.section === "consumer");
    expect(consumer?.stale.length).toBeGreaterThan(0);
  });

  it("allows annual World Bank unemployment", () => {
    expect(maxAgeDaysForMetric({ id: "unemp_overall", label: "U", value: 4, unit: "%", history: [], source: { provider: "World Bank", url: "" } })).toBeGreaterThan(300);
  });
});
