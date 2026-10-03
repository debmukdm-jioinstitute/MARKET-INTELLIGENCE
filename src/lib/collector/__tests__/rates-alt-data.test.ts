import { describe, expect, it } from "vitest";
import { tenorSlug, parseParYield } from "../sources/fbil";
import { parseWorldBank } from "../sources/worldbank";
import { parseUpiRows } from "../sources/upi-npci";
import { parseSiamRelease } from "../sources/siam-auto";
import { titleDay, fyLabel } from "../sources/power-demand";
import { parseOpenMeteo } from "../sources/monsoon";
import { computeMonsoon } from "@/lib/macro/monsoon";

describe("Rates and Alt-Data collectors & parsers", () => {
  it("parses FBIL tenor slugs correctly", () => {
    expect(tenorSlug("O/N")).toBe("on");
    expect(tenorSlug("7 Days")).toBe("7d");
    expect(tenorSlug("1 Month")).toBe("1m");
    expect(tenorSlug("12 Months")).toBe("12m");
    expect(tenorSlug("5Y")).toBe("5y");
  });

  it("parses World Bank annual series", () => {
    const json = [
      { page: 1 },
      [
        { date: "2025", value: 3956067115771.63 },
        { date: "2024", value: 3760813470500.86 },
        { date: "2023", value: null },
      ],
    ];
    const obs = parseWorldBank(json);
    expect(obs).toHaveLength(2);
    expect(obs[0]).toEqual({ date: "2024-12-31", value: 3760813470500.86 });
    expect(obs[1]).toEqual({ date: "2025-12-31", value: 3956067115771.63 });
  });

  it("parses NPCI UPI monthly JSON API results", () => {
    const json = {
      status: 200,
      data: {
        results: [
          { month: "September-2026", total_volume: "24068.38", total_value: "2937396.69" },
          { month: "August-2026", total_volume: "24508.95", total_value: "2982355.93" },
        ],
      },
    };
    const { vol, val } = parseUpiRows(json);
    expect(vol).toHaveLength(2);
    expect(val).toHaveLength(2);
    expect(vol[0]).toEqual({ date: "2026-09-01", value: 24068.38 });
    expect(val[0]).toEqual({ date: "2026-09-01", value: 2937396.69 });
  });

  it("parses SIAM auto sales press release HTML text", () => {
    const html = `
      <div>Auto Industry Performance of August-2026</div>
      <p>Domestic Sales: Passenger Vehicles sales were 4,39,309 units in August 2026.</p>
      <p>Three-wheeler sales were 93,764 units in August 2026</p>
      <p>Two-wheeler sales were 20,34,698 units in August 2026.</p>
      <p>In August 2026, Passenger Vehicles posted sales of 4.39 lakhs units with growth of 36.5%, Three Wheelers sales recorded 0.94 lakhs units with growth of 22.8%, and Two Wheelers Sales logged 20.35 lakhs units with growth of 10.5%</p>
    `;
    const res = parseSiamRelease(html);
    expect(res).not.toBeNull();
    expect(res?.month).toBe("2026-08-01");
    expect(res?.seg).toHaveLength(3);
    const pv = res?.seg.find((s) => s.key === "pv");
    expect(pv?.units).toBe(439309);
    expect(pv?.yoy).toBe(36.5);
  });

  it("parses Grid India title dates and FY labels", () => {
    expect(titleDay("30.09.26_NLDC_PSP")).toBe("2026-09-30");
    expect(fyLabel("2026-09-30")).toBe("2026-27");
    expect(fyLabel("2026-01-15")).toBe("2025-26");
  });

  it("parses Open-Meteo rainfall observations", () => {
    const json = {
      daily: {
        time: ["2026-09-28", "2026-09-29", "2026-10-03"],
        precipitation_sum: [12.4, 0, 5.2],
      },
    };
    const obs = parseOpenMeteo(json, "2026-10-03");
    expect(obs).toHaveLength(2); // skips today 2026-10-03
    expect(obs[0]).toEqual({ date: "2026-09-28", value: 12.4 });
    expect(obs[1]).toEqual({ date: "2026-09-29", value: 0 });
  });

  it("computes monsoon % of normal correctly", () => {
    const loc1 = [
      { date: "2025-06-01", value: 10 },
      { date: "2026-06-01", value: 12 },
    ];

    const loc2 = [
      { date: "2025-06-01", value: 20 },
      { date: "2026-06-01", value: 24 },
    ];

    const res = computeMonsoon({ loc1, loc2 }, "2026-06-02");
    expect(res.mode).toBe("season");
    expect(res.locations).toBe(2);
  });
});
