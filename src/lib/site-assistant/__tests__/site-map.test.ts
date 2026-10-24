import { describe, expect, it } from "vitest";
import { isAllowedHref, searchPages } from "@/lib/site-assistant/site-map";

describe("isAllowedHref", () => {
  it("allows nav paths with query strings", () => {
    expect(isAllowedHref("/economy?section=calendar")).toBe(true);
    expect(isAllowedHref("/economy?section=india-macro")).toBe(true);
    expect(isAllowedHref("/markets?section=breadth")).toBe(true);
  });

  it("allows newly integrated intelligence pages", () => {
    expect(isAllowedHref("/funds")).toBe(true);
    expect(isAllowedHref("/funds?section=institutional")).toBe(true);
    expect(isAllowedHref("/companies?section=promoters")).toBe(true);
    expect(isAllowedHref("/companies?section=credit")).toBe(true);
    expect(isAllowedHref("/companies?section=company")).toBe(true);
    expect(isAllowedHref("/companies?section=retail-sentiment")).toBe(true);
    expect(isAllowedHref("/companies?section=offers")).toBe(true);
  });

  it("rejects external URLs", () => {
    expect(isAllowedHref("https://evil.com")).toBe(false);
  });
});

describe("searchPages", () => {
  it("finds economic calendar by keywords", () => {
    const hits = searchPages("economic calendar", 5);
    expect(hits.some((h) => h.href.includes("calendar"))).toBe(true);
  });

  it("finds mutual fund, promoter, credit, and reddit pages", () => {
    const mfHits = searchPages("mutual fund", 5);
    expect(mfHits.some((h) => h.href.includes("section=institutional"))).toBe(true);

    const promoterHits = searchPages("promoter", 5);
    expect(promoterHits.some((h) => h.href.includes("section=promoters"))).toBe(true);

    const creditHits = searchPages("credit risk", 5);
    expect(creditHits.some((h) => h.href.includes("section=credit"))).toBe(true);

    const redditHits = searchPages("reddit sentiment", 5);
    expect(redditHits.some((h) => h.href.includes("section=retail-sentiment"))).toBe(true);
  });
});
