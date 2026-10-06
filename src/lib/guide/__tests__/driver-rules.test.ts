import { describe, expect, it } from "vitest";
import { buildNudges, profileFor } from "../driver-rules";
import type { BetaPayload } from "@/lib/transmission/betas";

const cell = (beta: number, t: number) => ({ beta, se: 0.1, t });
const betas = {
  computedAt: "", windowStart: "", windowEnd: "", method: "",
  factors: [],
  sectors: [
    { id: "oilgas", label: "Oil & Gas", proxy: "", r2: 0.2, residSd: 1, n: 500,
      betas: { brent: cell(0.3, 4), usdinr: cell(0.1, 0.5), us10y: cell(-0.05, 1), spx: cell(0.2, 3) } },
  ],
} as unknown as BetaPayload;

describe("buildNudges", () => {
  it("nudges Reliance toward crude first with implied move", () => {
    const { nudges } = buildNudges("RELIANCE", "Reliance Industries", betas, { brent: 2 });
    expect(nudges[0].factor).toBe("brent");
    expect(nudges[0].href).toBe("/macro/commodities");
    expect(nudges[0].impliedPct).toBeCloseTo(0.6);
  });
  it("works with no data (instant, curated only)", () => {
    const { nudges } = buildNudges("RELIANCE", "Reliance Industries", null, null);
    expect(nudges.map((n) => n.factor)).toContain("brent");
  });
  it("infers sector from name", () => {
    expect(profileFor("XYZ", "Foo Pharma Ltd").sector).toBe("pharma");
  });
});

import { buildExposure, buildIndexNudges, sectorIdForLabel } from "../driver-rules";

describe("index and exposure nudges", () => {
  const mk = (id: string, label: string, brent: [number, number], usdinr: [number, number]) => ({
    id, label, proxy: "", r2: 0.2, residSd: 1, n: 500,
    betas: { brent: { beta: brent[0], se: 0.1, t: brent[1] }, usdinr: { beta: usdinr[0], se: 0.1, t: usdinr[1] }, us10y: { beta: 0, se: 0.1, t: 0 }, spx: { beta: 0, se: 0.1, t: 0 } },
  });
  const b = { computedAt: "", windowStart: "", windowEnd: "", method: "", factors: [], sectors: [mk("oilgas", "Oil & Gas", [0.4, 5], [0.1, 1]), mk("it", "IT", [0, 0.2], [0.3, 4]), mk("nifty", "NIFTY 50", [0.1, 3], [0, 0])] } as unknown as BetaPayload;

  it("maps sector labels", () => {
    expect(sectorIdForLabel("Financial Services")).toBe("bank");
    expect(sectorIdForLabel("Fast Moving Consumer Goods")).toBe("fmcg");
    expect(sectorIdForLabel("Telecommunication")).toBeNull();
  });
  it("weights betas by sector and reports coverage", () => {
    const r = buildIndexNudges([{ name: "Oil, Gas & Consumables", weight: 10 }, { name: "Information Technology", weight: 10 }, { name: "Telecommunication", weight: 5 }], b, { brent: 2, usdinr: 1 });
    expect(r.coveragePct).toBe(80);
    expect(r.nudges.map((n) => n.factor)).toContain("brent");
    expect(r.nudges.find((n) => n.factor === "brent")!.beta).toBeCloseTo(0.2);
  });
  it("ranks sector exposure to a driver and skips noise", () => {
    const e = buildExposure("brent", b, { brent: 2 });
    expect(e.map((x) => x.label)).toEqual(["Oil & Gas"]);
    expect(e[0].impliedPct).toBeCloseTo(0.8);
  });
});
