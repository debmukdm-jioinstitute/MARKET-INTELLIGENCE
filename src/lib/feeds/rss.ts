import type { FeedSourceId, NewsItem } from "@/lib/feeds/types";
import { normalizeNewsPublishedAt } from "@/lib/feeds/news-sort";
import { createHash } from "node:crypto";

/**
 * Decode the HTML/XML entities that feed publishers leave in titles and links
 * (Google News RSS is the worst offender: "Larsen &amp; Toubro", "&#39;", "&quot;").
 * Handles named entities plus decimal/hex numeric references.
 */
export function decodeHtmlEntities(s: string): string {
  if (!s || !s.includes("&")) return s;
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return s
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => named[name.toLowerCase()] ?? m);
}

function tag(block: string, name: string) {
  const cdata = new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`, "i").exec(
    block,
  );
  if (cdata) return decodeHtmlEntities(cdata[1]!.trim());
  const plain = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  if (!plain) return "";
  return decodeHtmlEntities(
    plain[1]!.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim(),
  );
}

function linkFromBlock(block: string) {
  const href = /<link[^>]+href=["']([^"']+)["']/i.exec(block);
  if (href) return href[1]!.trim();
  const raw = tag(block, "link");
  if (raw.startsWith("http")) return raw;
  return raw;
}

export function parseRss(xml: string, source: FeedSourceId, limit = 12): NewsItem[] {
  const blocks =
    xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks.slice(0, limit)) {
    const title = tag(block, "title");
    const link = linkFromBlock(block);
    if (!title || !link) continue;
    const publishedRaw = tag(block, "pubDate") || tag(block, "updated") || undefined;
    const publishedAt = normalizeNewsPublishedAt(publishedRaw);
    // Google News RSS carries the publisher in <source url="...">Publisher Name</source>;
    // titles also end with " - Publisher Name", which the UI can strip when rendering.
    const publisher = tag(block, "source") || undefined;
    // Hash the FULL link: Google News links share a long common prefix, so a sliced
    // base64 of the raw link gave every item the same id (duplicate React keys).
    const id = `${source}-${createHash("sha1").update(link).digest("base64url").slice(0, 16)}`;
    items.push({ id, source, title, link, publishedAt, publisher });
  }
  return items;
}
