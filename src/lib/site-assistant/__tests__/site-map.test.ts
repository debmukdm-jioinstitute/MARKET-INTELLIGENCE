import { describe, expect, it } from "vitest";
import { isAllowedHref, searchPages } from "@/lib/site-assistant/site-map";

describe("isAllowedHref", () => {
  it("allows nav paths with query strings", () => {
    expect(isAllowedHref("/macro/india?view=calendar")).toBe(true);
    expect(isAllowedHref("/macro/india")).toBe(true);
    expect(isAllowedHref("/markets/breadth?view=momentum")).toBe(true);
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
});
