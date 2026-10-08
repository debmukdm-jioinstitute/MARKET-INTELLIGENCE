import { describe, expect, it } from "vitest";
import { logoUrl } from "@/lib/company-logo";

describe("logoUrl", () => {
  it("returns a static path for symbols with a logo (raw, incl. &)", () => {
    expect(logoUrl("HDFCBANK")).toBe("/logos/HDFCBANK.png");
    expect(logoUrl("m&mfin")).toBe("/logos/M&MFIN.png");
  });
  it("returns null for unknown / empty symbols", () => {
    expect(logoUrl("NOT_A_REAL_SYMBOL")).toBeNull();
    expect(logoUrl("")).toBeNull();
    expect(logoUrl(null)).toBeNull();
  });
});
