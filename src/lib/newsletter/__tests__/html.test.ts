import { describe, expect, it } from "vitest";
import { normalizeNewsletterBody, plainTextToHtml, sanitizeNewsletterHtml } from "@/lib/newsletter/html";

describe("newsletter html", () => {
  it("turns plain lines into paragraphs", () => {
    const html = plainTextToHtml("Line one\nLine two");
    expect(html).toContain("Line one");
    expect(html).toContain("Line two");
    expect(html).toContain("<p");
  });

  it("strips scripts", () => {
    expect(sanitizeNewsletterHtml('<p>ok</p><script>alert(1)</script>')).not.toContain("script");
  });

  it("wraps each img in a block", () => {
    const out = normalizeNewsletterBody('<p>Hi</p><img src="https://example.com/a.png" />');
    expect(out.match(/<img/g)?.length).toBe(1);
    expect(out).toContain("max-width:100%");
  });
});
