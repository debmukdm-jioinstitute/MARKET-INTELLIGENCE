import type { FeedSourceId, NewsItem } from "@/lib/feeds/types";
import { normalizeNewsPublishedAt } from "@/lib/feeds/news-sort";
import { createHash } from "node:crypto";

function tag(block: string, name: string) {
  const cdata = new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`, "i").exec(
    block,
  );
  if (cdata) return cdata[1]!.trim();
  const plain = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  if (!plain) return "";
  return plain[1]!.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim();
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
    // Hash the FULL link: Google News links share a long common prefix, so a sliced
    // base64 of the raw link gave every item the same id (duplicate React keys).
    const id = `${source}-${createHash("sha1").update(link).digest("base64url").slice(0, 16)}`;
    items.push({ id, source, title, link, publishedAt });
  }
  return items;
}
