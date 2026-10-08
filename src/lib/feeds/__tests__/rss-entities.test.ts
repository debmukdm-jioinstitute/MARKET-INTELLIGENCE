import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, parseRss } from "@/lib/feeds/rss";

describe("decodeHtmlEntities", () => {
  it("decodes named, decimal, and hex entities", () => {
    expect(decodeHtmlEntities("Larsen &amp; Toubro")).toBe("Larsen & Toubro");
    expect(decodeHtmlEntities("it&#39;s")).toBe("it's");
    expect(decodeHtmlEntities("&#x27;quoted&#x27;")).toBe("'quoted'");
    expect(decodeHtmlEntities("&lt;tag&gt;")).toBe("<tag>");
  });

  it("leaves plain text and unknown entities alone", () => {
    expect(decodeHtmlEntities("plain headline")).toBe("plain headline");
    expect(decodeHtmlEntities("a &bogus; b")).toBe("a &bogus; b");
    expect(decodeHtmlEntities("")).toBe("");
  });
});

describe("parseRss entity + publisher handling", () => {
  const xml = `<?xml version="1.0"?>
<rss><channel>
<item>
<title>Larsen &amp; Toubro (NSE: LT) Up 0.32% - Kalkine India</title>
<link>https://news.google.com/rss/articles/abc</link>
<pubDate>Thu, 08 Oct 2026 10:00:00 GMT</pubDate>
<source url="https://kalkinemedia.com">Kalkine India</source>
</item>
</channel></rss>`;

  it("decodes entities in titles and captures the publisher", () => {
    const [item] = parseRss(xml, "googlenews", 5);
    expect(item).toBeDefined();
    expect(item!.title).toBe("Larsen & Toubro (NSE: LT) Up 0.32% - Kalkine India");
    expect(item!.publisher).toBe("Kalkine India");
    expect(item!.link).toBe("https://news.google.com/rss/articles/abc");
  });
});
