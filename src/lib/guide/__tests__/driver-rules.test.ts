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
