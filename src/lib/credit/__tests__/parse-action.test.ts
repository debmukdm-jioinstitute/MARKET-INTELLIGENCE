import { describe, expect, it } from "vitest";
import { inferCreditActionFromTitle, inferCompanyNameFromTitle } from "@/lib/credit/parse-action";

describe("credit parse-action", () => {
  it("infers downgrade and upgrade from headlines", () => {
    expect(inferCreditActionFromTitle("XYZ Ltd downgraded to BB")).toBe("RATING_DOWNGRADE");
    expect(inferCreditActionFromTitle("ABC upgraded to AA")).toBe("RATING_UPGRADE");
    expect(inferCreditActionFromTitle("Outlook revised to Negative")).toBe("OUTLOOK_CHANGE");
  });

  it("extracts company fragment from title", () => {
    expect(inferCompanyNameFromTitle("Reliance Industries - Rating Rationale")).toBe("Reliance Industries");
  });
});
