import { describe, expect, it } from "vitest";
import { categorizeObject, extractObjects, extractTopRisks } from "@/lib/collector/drhp";

const RISK_PAGES = [
  "Contents of the offer document. SECTION III: INTRODUCTION",
  "SECTION II: RISK FACTORS\nAn investment in equity shares involves a high degree of risk. Please read carefully.",
  "Internal Risk Factors\n1. We derive a significant portion of our revenue from a limited number of customers. Any loss of such customers could hurt us.\n" +
    "Details of the customers follow in this paragraph with plenty of words to read.\n" +
    "2. Our manufacturing facilities are concentrated in a single state, exposing us to regional disruptions that may adversely affect operations.\n" +
    "Revenue from Dealers Sales as a % of Revenue from Operations 39.92 39.64 53.86 60.34 70.91\n4. Revenue from Sales of Distributors (₹ million) 1,911.07 238.04 61.64\n" +
    "3. We have substantial indebtedness and our lenders impose restrictive covenants which may limit our flexibility to raise additional funds.\n" +
    "4. We may be unable to execute our expansion plans on time or within budget, which could adversely affect our results of operations.",
  "SECTION III: INTRODUCTION\n1. This is not a risk",
];

describe("extractTopRisks", () => {
  const risks = extractTopRisks(RISK_PAGES, 5);
  it("returns the running numbered sequence, verbatim, skipping table rows", () => {
    expect(risks).toHaveLength(4);
    expect(risks[0]).toMatch(/^We derive a significant portion of our revenue/);
    expect(risks[2]).toMatch(/^We have substantial indebtedness/);
    expect(risks[3]).toMatch(/^We may be unable to execute our expansion plans/);
    expect(risks.join(" ")).not.toMatch(/1,911\.07/);
  });
  it("stops at the next section and handles documents without a risk section", () => {
    expect(risks.join(" ")).not.toMatch(/not a risk/);
    expect(extractTopRisks(["nothing here"], 5)).toEqual([]);
  });
});

describe("extractObjects", () => {
  const pages = [
    "see “Objects of the Offer – Details of the Object – Repayment and/or prepayment, in part or full of certain borrowings availed by our Company” on page 140.",
    "see “Objects of the Offer – Details of the Object – Funding the capital expenditure requirements of our Company towards expansion of Dehlon Facility” on page 129. " +
      "see “Objects of the Offer – Details of the Object – Repayment and/or prepayment, in part or full of certain borrowings availed by our Company” again. " +
      "see “Objects of the Offer – Details of the Object – General corporate purposes” and “Objects of the Offer – Offer-related Expenses” . " +
      "The Offer comprises a Fresh Issue of up to ₹ 3,000 million and an Offer for Sale by the Promoter Selling Shareholder.",
  ];
  const o = extractObjects(pages);
  it("lists distinct object titles as the document states them, with a category", () => {
    expect(o.objects.map((x) => x.category).sort()).toEqual(["capex", "debt-repayment", "general-corporate"]);
    expect(o.objects).toHaveLength(3);
  });
  it("reads the fresh-issue size and OFS flag when stated", () => {
    expect(o.freshIssueMillions).toBe(3000);
    expect(o.hasOfferForSale).toBe(true);
  });
  it("categorises by keyword", () => {
    expect(categorizeObject("Funding working capital requirements")).toBe("working-capital");
    expect(categorizeObject("Acquisition of a brand")).toBe("other");
  });
});
