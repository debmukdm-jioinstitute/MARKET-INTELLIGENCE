import { describe, expect, it } from "vitest";
import {
  extractImageSrcs,
  finalizeNewsletterImageBlocks,
  isAllowedNewsletterClickUrl,
  normalizeNewsletterClickUrl,
  readImageClickUrl,
} from "@/lib/newsletter/image-links";

describe("newsletter image links", () => {
  it("normalizes bare domains to https", () => {
    expect(normalizeNewsletterClickUrl("getmarketintelligence.in/pricing")).toBe(
      "https://getmarketintelligence.in/pricing",
    );
  });

  it("rejects javascript urls", () => {
    expect(isAllowedNewsletterClickUrl("javascript:alert(1)")).toBe(false);
  });

  it("extracts srcs and reads anchor href", () => {
    const html =
      '<p><a href="https://example.com/x"><img src="https://cdn/a.png" alt="" /></a></p>';
    expect(extractImageSrcs(html)).toEqual(["https://cdn/a.png"]);
    expect(readImageClickUrl(html, "https://cdn/a.png")).toBe("https://example.com/x");
  });

  it("keeps linked images in email blocks", () => {
    const out = finalizeNewsletterImageBlocks(
      '<a href="https://example.com"><img src="https://cdn/a.png" /></a>',
    );
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain("<img");
  });
});
