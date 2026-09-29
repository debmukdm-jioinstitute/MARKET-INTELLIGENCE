import { describe, expect, it } from "vitest";
import { isAllowedHref, searchPages } from "@/lib/site-assistant/site-map";

describe("isAllowedHref", () => {
  it("allows nav paths with query strings", () => {
    expect(isAllowedHref("/macro/india?view=calendar")).toBe(true);
    expect(isAllowedHref("/macro/india")).toBe(true);
    expect(isAllowedHref("/markets/breadth?view=momentum")).toBe(true);
  });

  it("allows newly integrated intelligence and fund pages", () => {
    expect(isAllowedHref("/funds")).toBe(true);
    expect(isAllowedHref("/funds?tab=overlap")).toBe(true);
    expect(isAllowedHref("/funds?tab=accumulation")).toBe(true);
    expect(isAllowedHref("/intelligence/promoters")).toBe(true);
    expect(isAllowedHref("/intelligence/credit")).toBe(true);
    expect(isAllowedHref("/intelligence/company")).toBe(true);
    expect(isAllowedHref("/intelligence/reddit")).toBe(true);
    expect(isAllowedHref("/research/offers")).toBe(true);
    expect(isAllowedHref("/research/model/TCS")).toBe(true);
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
    expect(mfHits.some((h) => h.href.includes("/funds"))).toBe(true);

    const promoterHits = searchPages("promoter", 5);
    expect(promoterHits.some((h) => h.href.includes("/intelligence/promoters"))).toBe(true);

    const creditHits = searchPages("credit risk", 5);
    expect(creditHits.some((h) => h.href.includes("/intelligence/credit"))).toBe(true);

    const redditHits = searchPages("reddit sentiment", 5);
    expect(redditHits.some((h) => h.href.includes("/intelligence/reddit"))).toBe(true);
  });
});
