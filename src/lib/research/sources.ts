const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

const KNOWN_BROKERS = [
  "Motilal Oswal",
  "Morgan Stanley",
  "Nuvama",
  "Elara Capital",
  "Elara",
  "Goldman Sachs",
  "Jefferies",
  "CLSA",
  "Kotak Institutional",
  "Kotak",
  "ICICI Securities",
  "ICICI Direct",
  "HDFC Securities",
  "Nomura",
  "UBS",
  "Citi",
  "JPMorgan",
  "JP Morgan",
  "Macquarie",
  "Antique",
  "Prabhudas Lilladher",
  "Emkay",
  "Axis Securities",
  "Sharekhan",
  "Geojit",
  "IIFL",
  "Systematix",
  "Anand Rathi",
  "Centrum",
  "Yes Securities",
  "InCred",
  "Bernstein",
  "BofA",
  "Bank of America",
  "Investec",
  "CareEdge",
  "MarketSmith India",
  "Choice Broking",
  "SBICAP",
  "Ventura",
  "Dolat Capital",
];

function guessBrokers(title: string): string | null {
  const hits = KNOWN_BROKERS.filter((b) => title.toLowerCase().includes(b.toLowerCase()));
  if (hits.length === 0) return null;
  // Dedupe near-duplicates like "Kotak" + "Kotak Institutional" by keeping the longest match per prefix.
  const deduped = hits.filter((h) => !hits.some((other) => other !== h && other.length > h.length && other.toLowerCase().includes(h.toLowerCase())));
  return Array.from(new Set(deduped)).slice(0, 3).join(", ");
}

async function fetchText(url: string, timeoutMs = 12_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export type ScrapedReport = {
  broker: string | null;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string | null;
};

export type ResearchSource = {
  key: string;
  label: string;
  fetchReports: () => Promise<ScrapedReport[]>;
};

/** Economic Times "Buy, Sell or Hold" broker recos listing — server-rendered <div class="eachStory"> blocks. */
async function fetchEtRecos(): Promise<ScrapedReport[]> {
  const html = await fetchText("https://economictimes.indiatimes.com/markets/stocks/recos");
  const items: ScrapedReport[] = [];
  // Each recos item is one "eachStory" block — parsing block-by-block (rather than one
  // mega-regex spanning title/date/summary) tolerates ET reordering fields inside a block.
  const blocks = html.split('<div class="eachStory">').slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/<h3><a[^>]+href="([^"]+)"[^>]*>(?:<meta[^>]*>)?([^<]+)<\/a><\/h3>/);
    if (!titleMatch) continue;
    const [, hrefRaw, titleRaw] = titleMatch;
    const title = decodeHtml(titleRaw.trim());
    const url = hrefRaw.startsWith("http") ? hrefRaw : `https://economictimes.indiatimes.com${hrefRaw}`;
    const dateMatch = block.match(/<time[^>]*data-time="([^"]*)"/);
    const publishedAt = dateMatch ? parseEtDate(dateMatch[1]) : null;
    const summaryMatch = block.match(/<\/time>\s*<p[^>]*>([\s\S]*?)<\/p>/);
    const summary = summaryMatch ? decodeHtml(stripTags(summaryMatch[1])).trim() || null : null;
    items.push({ broker: guessBrokers(title), title, url, summary, publishedAt });
  }
  return items;
}

/** LiveMint "Stock Recommendations" topic listing — <h2 class="listingH2"> wrapped in an <a>. */
async function fetchLiveMintRecommendations(): Promise<ScrapedReport[]> {
  const html = await fetchText("https://www.livemint.com/topic/stock-recommendations");
  const items: ScrapedReport[] = [];
  const anchorRe = /<a[^>]+href="([^"]+)"[^>]*>\s*<h2[^>]*>([^<]{5,200})<\/h2>\s*<\/a>(?:<p class="storyDescription">([\s\S]*?)<\/p>)?/g;
  let match: RegExpExecArray | null;
  const now = new Date();
  while ((match = anchorRe.exec(html)) !== null) {
    const [, hrefRaw, titleRaw, summaryRaw] = match;
    if (!hrefRaw || !titleRaw) continue;
    const title = decodeHtml(titleRaw.trim());
    const summary = summaryRaw ? decodeHtml(stripTags(summaryRaw)).trim() || null : null;
    items.push({
      broker: guessBrokers(title) ?? (title.toLowerCase().includes("marketsmith") ? "MarketSmith India" : null),
      title,
      url: hrefRaw,
      summary,
      publishedAt: parseDateFromTitle(title, now),
    });
  }
  return items;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}

/** ET's <time data-time="Dec 31, 2025, 09:49 AM IST"> format. */
function parseEtDate(raw: string): string | null {
  const cleaned = raw.replace(" IST", "");
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** LiveMint titles read like "... for 22 September" — no explicit date field, so infer it, rolling back a year if the parsed date would land in the future. */
function parseDateFromTitle(title: string, now: Date): string | null {
  const m = title.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month === -1) return null;
  let year = now.getFullYear();
  let candidate = new Date(Date.UTC(year, month, day, 6, 0, 0));
  if (candidate.getTime() - now.getTime() > 3 * 24 * 60 * 60 * 1000) {
    year -= 1;
    candidate = new Date(Date.UTC(year, month, day, 6, 0, 0));
  }
  return candidate.toISOString();
}

export const RESEARCH_SOURCES: ResearchSource[] = [
  { key: "et_recos", label: "Economic Times — Buy/Sell/Hold", fetchReports: fetchEtRecos },
  { key: "livemint_recos", label: "LiveMint — Stock Recommendations", fetchReports: fetchLiveMintRecommendations },
];
