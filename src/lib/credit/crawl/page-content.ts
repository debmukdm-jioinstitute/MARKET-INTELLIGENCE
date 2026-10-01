import { feedFetch } from "@/lib/feeds/http";
import type { CreditFeedCollector } from "@/lib/credit/types";

export type CrawledPage = {
  url: string;
  markdown: string;
  collector: CreditFeedCollector;
};

const MIN_USEFUL_HTML = 2500;

async function fetchNativeHtml(url: string): Promise<string | null> {
  try {
    const res = await feedFetch(url, {
      timeoutMs: 18_000,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; +https://getmarketintelligence.in)",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchFirecrawlMarkdown(url: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await feedFetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      timeoutMs: 45_000,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: { markdown?: string } };
    const md = json.data?.markdown?.trim();
    return md && md.length > 200 ? md : null;
  } catch {
    return null;
  }
}

/** Self-hosted Crawl4AI Docker (`/crawl` or `/md` depending on deployment). */
async function fetchCrawl4AiMarkdown(url: string): Promise<string | null> {
  const base = process.env.CRAWL4AI_API_URL?.replace(/\/$/, "");
  if (!base) return null;
  const endpoint = `${base}/crawl`;
  try {
    const res = await feedFetch(endpoint, {
      method: "POST",
      timeoutMs: 55_000,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [url],
        crawler_config: { cache_mode: "bypass" },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: Array<{ markdown?: string; cleaned_html?: string; url?: string }>;
    };
    const md = json.results?.[0]?.markdown?.trim();
    if (md && md.length > 200) return md;
    const html = json.results?.[0]?.cleaned_html;
    if (html && html.length > MIN_USEFUL_HTML) return html.replace(/<[^>]+>/g, " ");
    return null;
  } catch {
    return null;
  }
}

function htmlToRoughText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rendered page text for parser — native HTML first, then Firecrawl, then Crawl4AI.
 * Matches firecrawl/firecrawl + unclecode/crawl4AI as optional render backends on Vercel.
 */
export async function fetchAgencyPageContent(url: string): Promise<CrawledPage | null> {
  const html = await fetchNativeHtml(url);
  if (html && html.length >= MIN_USEFUL_HTML) {
    const text = htmlToRoughText(html);
    if (text.length >= 400) {
      return { url, markdown: text, collector: "native" };
    }
  }

  const firecrawlMd = await fetchFirecrawlMarkdown(url);
  if (firecrawlMd) return { url, markdown: firecrawlMd, collector: "firecrawl" };

  const crawl4Md = await fetchCrawl4AiMarkdown(url);
  if (crawl4Md) return { url, markdown: crawl4Md, collector: "crawl4ai" };

  return null;
}

export function extractMarkdownLinks(markdown: string, hostIncludes: string): string[] {
  const urls = new Set<string>();
  const re = /https?:\/\/[^\s)\]"'<>]+/gi;
  for (const m of markdown.matchAll(re)) {
    const u = m[0]!.replace(/[.,;]+$/, "");
    if (u.toLowerCase().includes(hostIncludes.toLowerCase())) urls.add(u);
  }
  return [...urls];
}
