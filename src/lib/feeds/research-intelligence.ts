import { feedFetch } from "@/lib/feeds/http";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

export type NewsImpact = "positive" | "neutral" | "negative";

export type CorporateActionRow = {
  symbol: string;
  subject: string;
  exDate?: string;
  recordDate?: string;
  company?: string;
  source: "nse" | "sec";
  link?: string;
};

export type AnalyzedNewsItem = NewsItem & {
  impact: NewsImpact;
  tags: string[];
  rationale: string;
  sourceLabel: string;
};

export type BrokerResearchItem = {
  id: string;
  title: string;
  url: string;
  kind: "headline" | "portal" | "search";
  source: string;
  publishedAt?: string;
  note?: string;
};

export type NewsImpactSummary = {
  overall: NewsImpact;
  score: number;
  headline: string;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
};

export type ResearchIntelligence = {
  corporateActions: CorporateActionRow[];
  newsFeed: AnalyzedNewsItem[];
  newsSummary: NewsImpactSummary;
  brokerResearch: BrokerResearchItem[];
};

type NseCorpRow = {
  symbol?: string;
  subject?: string;
  exDate?: string;
  recDate?: string;
  comp?: string;
};

const SEC_UA =
  process.env.FEED_USER_AGENT ?? "MarketIntelligence research@getmarketintelligence.vercel.app";

let secTickerCache: Map<string, string> | null = null;

async function secCik(symbol: string): Promise<string | undefined> {
  try {
    if (!secTickerCache) {
      const res = await feedFetch("https://www.sec.gov/files/company_tickers.json", {
        headers: { "User-Agent": SEC_UA },
      });
      if (!res.ok) return undefined;
      const json = (await res.json()) as Record<string, { cik_str: number; ticker: string }>;
      secTickerCache = new Map();
      for (const row of Object.values(json)) {
        secTickerCache.set(row.ticker.toUpperCase(), String(row.cik_str).padStart(10, "0"));
      }
    }
    return secTickerCache.get(symbol.toUpperCase());
  } catch {
    return undefined;
  }
}

export async function fetchNseCorporateActions(symbol: string): Promise<CorporateActionRow[]> {
  try {
    const rows = await nseJson<NseCorpRow[]>(
      `/api/corporates-corporateActions?index=equities&symbol=${encodeURIComponent(symbol)}`,
    );
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, 20).map((r) => ({
      symbol: r.symbol ?? symbol,
      subject: r.subject ?? "Corporate action",
      exDate: r.exDate,
      recordDate: r.recDate,
      company: r.comp,
      source: "nse",
      link: `https://www.nseindia.com/companies-listing/corporate-filings-actions`,
    }));
  } catch {
    return [];
  }
}

export async function fetchSecCorporateFilings(symbol: string): Promise<CorporateActionRow[]> {
  const cik = await secCik(symbol);
  if (!cik) return [];
  const cikNum = cik.replace(/^0+/, "");
  try {
    const res = await feedFetch(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`, {
      headers: { "User-Agent": SEC_UA },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      name?: string;
      filings?: {
        recent?: {
          form?: string[];
          filingDate?: string[];
          primaryDocument?: string[];
          accessionNumber?: string[];
          primaryDocDescription?: string[];
        };
      };
    };
    const recent = json.filings?.recent;
    if (!recent?.form?.length) return [];
    const corpForms = new Set(["8-K", "10-K", "10-Q", "DEF 14A", "S-1", "424B5"]);
    const out: CorporateActionRow[] = [];
    for (let i = 0; i < Math.min(recent.form.length, 40); i++) {
      const form = recent.form[i];
      if (!form || !corpForms.has(form)) continue;
      const acc = recent.accessionNumber?.[i]?.replace(/-/g, "");
      const doc = recent.primaryDocument?.[i];
      const link =
        acc && doc
          ? `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${doc}`
          : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${form}&dateb=&owner=exclude&count=20`;
      const desc = recent.primaryDocDescription?.[i];
      out.push({
        symbol,
        subject: desc ? `${form}: ${desc}` : form,
        exDate: recent.filingDate?.[i],
        company: json.name,
        source: "sec",
        link,
      });
      if (out.length >= 12) break;
    }
    return out;
  } catch {
    return [];
  }
}

function googleNewsRssUrl(query: string, market: "IN" | "US") {
  const q = encodeURIComponent(query);
  if (market === "IN") {
    return `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
  }
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

export async function fetchSymbolGoogleNews(
  symbol: string,
  name: string,
  market: "IN" | "US",
  limit = 15,
): Promise<NewsItem[]> {
  const query =
    market === "IN"
      ? `"${symbol}" OR "${name}" NSE stock`
      : `${symbol} ${name} stock`;
  const url = googleNewsRssUrl(query, market);
  try {
    const res = await feedFetch(url, { timeoutMs: 18_000 });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, "yahoo", limit).map((n) => ({
      ...n,
      id: `gn-${n.id}`,
      source: n.source,
    }));
  } catch {
    return [];
  }
}

export async function fetchAnalystHeadlinesRss(
  symbol: string,
  name: string,
  market: "IN" | "US",
): Promise<NewsItem[]> {
  const query =
    market === "IN"
      ? `"${symbol}" analyst target upgrade downgrade brokerage report`
      : `${symbol} analyst upgrade downgrade price target`;
  const url = googleNewsRssUrl(query, market);
  try {
    const res = await feedFetch(url, { timeoutMs: 18_000 });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, "yahoo", 10);
  } catch {
    return [];
  }
}

type ImpactRule = { pattern: RegExp; impact: NewsImpact; tag: string; rationale: string };

const IMPACT_RULES: ImpactRule[] = [
  {
    pattern: /\bbuy\s*back\b|\bshare\s*repurchase\b|\brepurchase\s*program\b/i,
    impact: "positive",
    tag: "buyback",
    rationale: "Buybacks reduce float and signal management confidence; often supportive for the share price.",
  },
  {
    pattern: /\bdividend\b|\binterim\s*dividend\b|\bfinal\s*dividend\b/i,
    impact: "positive",
    tag: "dividend",
    rationale: "Cash dividends reward shareholders and can reflect earnings strength.",
  },
  {
    pattern: /\bbonus\s*share\b|\bstock\s*dividend\b/i,
    impact: "positive",
    tag: "bonus",
    rationale: "Bonus issues increase retail liquidity; sentiment often positive though per-share metrics adjust.",
  },
  {
    pattern: /\bsplit\b|\bstock\s*split\b/i,
    impact: "neutral",
    tag: "split",
    rationale: "Splits change share count and price level; fundamental value unchanged.",
  },
  {
    pattern: /\bright(s)?\s*issue\b|\bpreferential\s*allotment\b/i,
    impact: "negative",
    tag: "dilution",
    rationale: "Fresh equity can dilute existing holders unless priced at a premium with strong use of proceeds.",
  },
  {
    pattern: /\bupgrade\b|\braises?\s*target\b|\bprice\s*target\s*raised\b|\boutperform\b/i,
    impact: "positive",
    tag: "analyst",
    rationale: "Analyst upgrades and higher targets can improve sentiment and institutional interest.",
  },
  {
    pattern: /\bdowngrade\b|\bcut(s)?\s*target\b|\bunderperform\b|\breduce\b/i,
    impact: "negative",
    tag: "analyst",
    rationale: "Downgrades and lower targets often pressure the stock near term.",
  },
  {
    pattern: /\bbeat(s)?\s*estimate\b|\brecord\s*(profit|revenue|sales)\b|\bstrong\s*earnings\b/i,
    impact: "positive",
    tag: "earnings",
    rationale: "Earnings beats and record results tend to support the price.",
  },
  {
    pattern: /\bmiss(es)?\s*estimate\b|\bweak\s*earnings\b|\bprofit\s*warning\b|\bguidance\s*cut\b/i,
    impact: "negative",
    tag: "earnings",
    rationale: "Earnings misses and guidance cuts typically weigh on the stock.",
  },
  {
    pattern: /\bfraud\b|\bprobe\b|\binvestigation\b|\bpenalty\b|\bfine\b|\bsebi\b.*\b(action|order)\b/i,
    impact: "negative",
    tag: "regulatory",
    rationale: "Regulatory or fraud headlines raise governance and legal risk.",
  },
  {
    pattern: /\bacquisition\b|\bmerger\b|\btakeover\b|\bstake\s*purchase\b/i,
    impact: "neutral",
    tag: "m&a",
    rationale: "M&A can be positive or negative depending on price, funding, and strategic fit—verify deal terms.",
  },
  {
    pattern: /\bcontract\s*win\b|\border\s*win\b|\bapproval\b|\bclearance\b/i,
    impact: "positive",
    tag: "business",
    rationale: "Contract wins and regulatory approvals can improve revenue visibility.",
  },
  {
    pattern: /\bdefault\b|\binsolvency\b|\bbankruptcy\b|\bnpa\b|\bdebt\s*concern\b/i,
    impact: "negative",
    tag: "credit",
    rationale: "Credit stress headlines increase downside risk.",
  },
];

export function analyzeNewsHeadline(title: string, body = ""): {
  impact: NewsImpact;
  tags: string[];
  rationale: string;
} {
  const text = `${title} ${body}`;
  const tags: string[] = [];
  let impact: NewsImpact = "neutral";
  const rationales: string[] = [];

  for (const rule of IMPACT_RULES) {
    if (rule.pattern.test(text)) {
      tags.push(rule.tag);
      rationales.push(rule.rationale);
      if (rule.impact === "negative") impact = "negative";
      else if (rule.impact === "positive" && impact !== "negative") impact = "positive";
    }
  }

  const rationale =
    rationales.length > 0
      ? rationales[0]!
      : "No strong keyword signal in headline—treat as general market news and read the full article.";

  return { impact, tags: tags.length ? [...new Set(tags)] : ["general"], rationale };
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const n of items) {
    const key = n.title.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

export function analyzeNewsItems(
  items: NewsItem[],
  sourceLabel: string,
): AnalyzedNewsItem[] {
  return items.map((n) => {
    const { impact, tags, rationale } = analyzeNewsHeadline(n.title);
    return { ...n, impact, tags, rationale, sourceLabel };
  });
}

export function summarizeNewsImpact(items: AnalyzedNewsItem[]): NewsImpactSummary {
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let score = 0;
  for (const n of items) {
    if (n.impact === "positive") {
      positiveCount++;
      score += 1;
    } else if (n.impact === "negative") {
      negativeCount++;
      score -= 1;
    } else neutralCount++;
  }
  const overall: NewsImpact =
    score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  const headline =
    overall === "positive"
      ? "Recent headlines skew positive for sentiment (rule-based scan—not investment advice)."
      : overall === "negative"
        ? "Recent headlines skew negative; review corporate actions and filings."
        : "Mixed or neutral headline tone from open RSS sources.";
  return {
    overall,
    score,
    headline,
    positiveCount,
    negativeCount,
    neutralCount,
  };
}

function brokerPortalLinks(
  symbol: string,
  name: string,
  market: "IN" | "US",
  isin?: string,
): BrokerResearchItem[] {
  const items: BrokerResearchItem[] = [];
  if (market === "IN") {
    items.push({
      id: "screener",
      title: `Screener.in — ${symbol} documents & concalls`,
      url: `https://www.screener.in/company/${encodeURIComponent(symbol)}/`,
      kind: "portal",
      source: "Screener.in",
      note: "Free annual reports, presentations, and shareholder documents when available.",
    });
    items.push({
      id: "moneycontrol",
      title: `Moneycontrol — ${name} news & research`,
      url: `https://www.moneycontrol.com/stocks/cptmarket/compsearchnew.php?search_data=&cat=1&search_word=${encodeURIComponent(symbol)}`,
      kind: "portal",
      source: "Moneycontrol",
    });
    if (isin) {
      items.push({
        id: "bse",
        title: "BSE India corporate filings",
        url: `https://www.bseindia.com/stock-share-price/${isin.toLowerCase()}/${symbol.toLowerCase()}/`,
        kind: "portal",
        source: "BSE",
      });
    }
    items.push({
      id: "nse-ca",
      title: "NSE corporate actions calendar",
      url: "https://www.nseindia.com/companies-listing/corporate-filings-actions",
      kind: "portal",
      source: "NSE",
    });
    items.push({
      id: "gsearch-broker-in",
      title: "Search: brokerage / analyst reports (Google)",
      url: `https://www.google.com/search?q=${encodeURIComponent(`${symbol} ${name} brokerage report analyst PDF`)}`,
      kind: "search",
      source: "Google Search",
      note: "Opens external results; we do not host paid research PDFs.",
    });
  } else {
    items.push({
      id: "yahoo-research",
      title: `Yahoo Finance — ${symbol} analysis`,
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/analysis/`,
      kind: "portal",
      source: "Yahoo Finance",
    });
    items.push({
      id: "sec-edgar",
      title: `SEC EDGAR — ${symbol} filings`,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(name)}&CIK=&type=&owner=exclude&count=40`,
      kind: "portal",
      source: "SEC EDGAR",
    });
    items.push({
      id: "gsearch-broker-us",
      title: "Search: equity research & analyst notes (Google)",
      url: `https://www.google.com/search?q=${encodeURIComponent(`${symbol} equity research report filetype:pdf`)}`,
      kind: "search",
      source: "Google Search",
    });
  }
  return items;
}

export async function buildResearchIntelligence(input: {
  symbol: string;
  name: string;
  market: "IN" | "US";
  isin?: string;
  upstoxNews: NewsItem[];
}): Promise<ResearchIntelligence> {
  const { symbol, name, market, isin, upstoxNews } = input;

  const [nseCa, secCa, googleNews, analystRss] = await Promise.all([
    market === "IN" ? fetchNseCorporateActions(symbol) : Promise.resolve([]),
    market === "US" ? fetchSecCorporateFilings(symbol) : Promise.resolve([]),
    fetchSymbolGoogleNews(symbol, name, market),
    fetchAnalystHeadlinesRss(symbol, name, market),
  ]);

  const corporateActions = [...nseCa, ...secCa];

  const merged = dedupeNews([
    ...upstoxNews.map((n) => ({ ...n, id: `upstox-${n.id}` })),
    ...googleNews,
  ]);

  const analyzedUpstox = analyzeNewsItems(
    merged.filter((n) => n.id.startsWith("upstox-")),
    "Upstox",
  );
  const analyzedGoogle = analyzeNewsItems(
    merged.filter((n) => n.id.startsWith("gn-")),
    "Google News RSS",
  );
  const byId = new Map<string, AnalyzedNewsItem>();
  for (const n of [...analyzedUpstox, ...analyzedGoogle]) {
    const key = n.title.toLowerCase().slice(0, 90);
    if (!byId.has(key)) byId.set(key, n);
  }
  const newsFeed = [...byId.values()].slice(0, 24);
  const newsSummary = summarizeNewsImpact(newsFeed);

  const brokerResearch: BrokerResearchItem[] = [
    ...brokerPortalLinks(symbol, name, market, isin),
    ...analyzeNewsItems(analystRss, "Google News").map((n) => ({
      id: `br-${n.id}`,
      title: n.title,
      url: n.link,
      kind: "headline" as const,
      source: n.sourceLabel,
      publishedAt: n.publishedAt,
      note: `${n.impact} · ${n.rationale}`,
    })),
  ];

  return {
    corporateActions,
    newsFeed,
    newsSummary,
    brokerResearch,
  };
}
