import { describe, expect, it } from "vitest";
import { shapeIngestPayload, validateIngestBody } from "@/lib/collector/ingest";

const goodSeries = {
  id: "amfi_nav_149373",
  label: "Axis Nifty 50 Index Fund — NAV",
  unit: "₹",
  category: "funds",
  provider: "AMFI",
  url: "https://www.amfiindia.com/spages/NAVAll.txt",
  obs: [{ date: "2026-09-29", value: 42.5 }],
};

describe("validateIngestBody", () => {
  it("accepts a well-formed series", () => {
    const v = validateIngestBody({ series: [goodSeries], ok: ["amfi"] });
    expect(v.series).toHaveLength(1);
    expect(v.series[0].id).toBe("amfi_nav_149373");
    expect(v.ok).toEqual(["amfi"]);
    expect(v.rejected).toHaveLength(0);
  });

  it("rejects a series with zero usable observations (last-good preserved)", () => {
    const v = validateIngestBody({ series: [{ ...goodSeries, obs: [] }] });
    expect(v.series).toHaveLength(0);
    expect(v.rejected).toHaveLength(1);
    expect(v.rejected[0].id).toBe("amfi_nav_149373");
  });

  it("drops bad observations but keeps the usable ones", () => {
    const v = validateIngestBody({
      series: [
        {
          ...goodSeries,
          obs: [
            { date: "2026-09-29", value: 42.5 },
            { date: "not-a-date", value: 1 },
            { date: "2026-09-28", value: NaN },
            { date: "2026-09-28", value: 41.9 },
            { date: "2026-09-28", value: 41.7 }, // duplicate date → last wins
          ],
        },
      ],
    });
    expect(v.series).toHaveLength(1);
    expect(v.series[0].obs).toEqual([
      { date: "2026-09-28", value: 41.7 },
      { date: "2026-09-29", value: 42.5 },
    ]);
  });

  it("rejects unknown categories and missing ids", () => {
    const v = validateIngestBody({
      series: [{ ...goodSeries, category: "vibes" }, { ...goodSeries, id: "   " }, { ...goodSeries, id: "x", category: "macro" }],
    });
    expect(v.series.map((s) => s.id)).toEqual(["x"]);
    expect(v.rejected).toHaveLength(2);
  });

  it("passes failures through with truncated errors", () => {
    const v = validateIngestBody({ failures: [{ id: "rbi", error: "boom" }, { id: "", error: "x" }] });
    expect(v.failures).toEqual([{ id: "rbi", error: "boom" }]);
  });

  it("never throws on garbage input", () => {
    expect(validateIngestBody(null).series).toEqual([]);
    expect(validateIngestBody("nope").rejected).toEqual([]);
    expect(validateIngestBody({ series: [null, 42, "s"] }).rejected).toHaveLength(3);
  });
});

describe("shapeIngestPayload", () => {
  it("splits successes and failures", () => {
    const p = shapeIngestPayload([
      { collector: "amfi", results: [goodSeries as never] },
      { collector: "rbi", error: "HTTP 503" },
    ]);
    expect(p.series).toHaveLength(1);
    expect(p.ok).toEqual(["amfi"]);
    expect(p.failures).toEqual([{ id: "rbi", error: "HTTP 503" }]);
  });
});
