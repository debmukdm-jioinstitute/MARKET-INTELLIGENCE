import { describe, expect, it } from "vitest";
import { inferPromoterCategory } from "@/lib/promoters/parse-category";

describe("promoter parse-category", () => {
  it("classifies pledge and block deals", () => {
    expect(inferPromoterCategory("Promoter pledge of shares increases")).toBe("PLEDGE_INCREASE");
    expect(inferPromoterCategory("NSE block deal in XYZ")).toBe("BLOCK_DEAL");
    expect(inferPromoterCategory("Insider selling by director")).toBe("INSIDER_SELLING");
  });
});
