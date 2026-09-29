import { describe, expect, it } from "vitest";
import { parseProspectusText } from "../prospectus-parse";

describe("parseProspectusText", () => {
  it("extracts fresh issue, OFS, and risk bullets from synthetic DRHP text", () => {
    const text = `
      RISK FACTORS
      1. Our business depends on key customers and any loss may adversely affect revenue.
      2. Regulatory changes in our industry could result in higher compliance costs.
      OBJECTS OF THE ISSUE
      We intend to use proceeds for capex and working capital.
      Fresh Issue of equity shares aggregating up to ₹ 450 crore.
      Offer for Sale of up to ₹ 120 crore by existing shareholders.
      OUR PROMOTERS
      Mr Example Promoter holds majority stake and has experience since 1998.
    `.replace(/\s+/g, " ");

    const parsed = parseProspectusText(text);
    expect(parsed.freshIssueCr).toBe(450);
    expect(parsed.ofsCr).toBe(120);
    expect(parsed.riskBullets.length).toBeGreaterThan(0);
    expect(parsed.objectBullets.length).toBeGreaterThan(0);
    expect(parsed.promoterSnippet).toMatch(/Promoter/i);
  });
});
