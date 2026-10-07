import { feedFetch } from "@/lib/feeds/http";
import { newsPublishedAtMs } from "@/lib/feeds/news-sort";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";
import type { Driver } from "./business-lines";

/**
 * Live evidence for a driver, from free Google News RSS. Two feeds feed every card:
 *  - the DRIVER feed (cached per driver, shared by every stock that has the driver), and
 *  - the COMPANY feed (cached per company): headlines naming the company that also hit the driver's
 *    keywords are shown first, because "IRDAI cap hits PB Fintech" beats a generic sector story.
 * Candidates are ranked by keyword strength, source quality, recency and company mention; stock-tip
 * spam and near-duplicate wire copies are dropped.
 */

const TTL_MS = 30 * 60_000;
const WINDOW_DAYS = 30;
const ACTIVE_DAYS = 10;
const HALF_LIFE_DAYS = 10;

export type Evidence = { title: string; source: string | null; link: string; publishedAt: string | null; company?: boolean };
export type DriverEvidence = { items: Evidence[]; active: boolean; count: number };

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " };
const decode = (s: string) => s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m);

/** Social posts and low-signal aggregators are not evidence. */
const BLOCKED_SOURCE = /facebook|instagram|youtube|reddit|quora|twitter|\bx\.com|pinterest|linkedin|tiktok|sarkaritel|telegram|whatsapp/i;
/** Newsroom-quality outlets get a ranking boost. */
const TOP_SOURCE = /economic times|livemint|\bmint\b|business standard|moneycontrol|reuters|bloomberg|hindu businessline|the hindu|financial express|cnbc|ndtv profit|times of india|indian express|pib|press trust|\bpti\b|business today|forbes india|the print|scroll|bs\b/i;
/** Retail stock-tip and price-ticker content that matches keywords by accident. */
const NOISE = /stocks? to (?:buy|watch|bet)|buy or sell|target price|horoscope|share price (?:today|live)|top (?:gainers|losers)|sensex (?:today|live)|nifty (?:today|live)|stock market (?:live|today)|technical pick|intraday|multibagger|penny stock|price prediction|\bipo gmp\b|stocks in focus|trade setup|market wrap|opening bell|closing bell|market (?:size|report|forecast|analysis|research)|\\bcagr\\b|\\b20[3-9]\\d\\b|press release|webinar/i;

const rssUrl = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${WINDOW_DAYS}d`)}&hl=en-IN&gl=IN&ceid=IN:en`;

/** Google News titles end with " - Publisher". */
function splitTitle(rawTitle: string): { title: string; source: string | null } {
  const raw = decode(rawTitle);
  const i = raw.lastIndexOf(" - ");
  return i > 20 ? { title: raw.slice(0, i).trim(), source: raw.slice(i + 3).trim() } : { title: raw.trim(), source: null };
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
const jaccard = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
};

/**
 * Keywords say WHAT the story is about; context says it is the right WORLD. A headline must match both,
 * which removes "Brent Goose", "Monsoon Wedding", "Apm Terminals" style false hits. By authority, with
 * per-driver overrides for drivers sourced from "Market data".
 */
const CTX_BY_AUTHORITY: Record<string, string> = {
  RBI: "rbi|bank|loan|lend|nbfc|rate|credit|deposit|rupee|monetary|liquidity|inflation|fraud|payment",
  IRDAI: "irdai|insur|policy|policies|premium|claim|distributor|bancassurance",
  SEBI: "sebi|market|mutual fund|broker|exchange|trading|f&o|investor|amc|demat|derivative",
  NPCI: "upi|npci|payment|fintech|merchant|wallet",
  DoT: "telecom|spectrum|tariff|trai|jio|airtel|vodafone|mobile|agr|satcom",
  TRAI: "telecom|spectrum|tariff|trai|jio|airtel|vodafone|mobile|broadcast|satcom|dth",
  CERC: "power|electricity|discom|tariff|grid|cerc|transmission|energy",
  "Ministry of Power": "power|electricity|discom|grid|coal|energy|tariff",
  "Ministry of Coal": "coal|power|mine|mining",
  DGCA: "airline|aircraft|flight|dgca|indigo|air india|aviation|airport|pilot|engine",
  PNGRB: "gas|cng|png|lng|pipeline|pngrb|city gas",
  PPAC: "gas|oil|petrol|diesel|lng|cng|png|crude|fuel|lpg|ongc|atf|refiner",
  USFDA: "fda|pharma|drug|plant|usfda|inspection|generic",
  "US government": "us |u\\.s\\.|america|trump|tariff|visa|h-1b|outsourc|washington|fda|pharma|import",
  NPPA: "price|drug|medicine|stent|implant|nppa|pharma|hospital",
  CDSCO: "drug|pharma|medicine|cdsco|device",
  MoRTH: "vehicle|motor|road|auto|car|truck|highway|insurance|emission",
  MoD: "defence|navy|army|air force|dac|missile|aero|ordnance|military|hal|drdo",
  DGTR: "duty|import|dumping|china|dgtr|safeguard|tariff",
  CCI: "cci|antitrust|competition|market share|monopoly|e-commerce|quick commerce|platform",
  FSSAI: "fssai|food|label|ban|packaged",
  MNRE: "solar|wind|renewable|mnre|seci|green|module|almm|battery",
  "Ministry of Steel": "steel|iron|safeguard|import|duty|coking coal",
  "Ministry of Agriculture": "crop|sugar|rice|wheat|cotton|fertili|farm|msp|ethanol|monsoon|kharif|rabi|agri|export|subsidy|edible oil",
  "Ministry of Commerce": "export|import|trade|tariff|duty|fta|china|pli|dgft|sanction|crude",
  "Ministry of Finance": "budget|tax|gst|duty|finance ministry|government|subsidy|excise|disinvest|psu|scheme|tds|capex",
  "Ministry of Railways": "railway|rail|wagon|kavach|vande bharat|irctc|fare",
  "Ministry of I&B": "broadcast|ott|tv|film|media|content|cinema",
  "Ministry of Civil Aviation": "airline|airport|aviation|flight|airspace|tourist|visa|travel",
  GST: "gst|tax|council|input tax",
  RERA: "rera|real estate|housing|developer|stamp duty|property",
  NHAI: "nhai|highway|toll|road",
};
const CTX_BY_ID: Record<string, string> = {
  monsoon: "india|rural|kharif|rabi|imd|farm|crop|rain|sowing|demand|agri|reservoir|el nino",
  brent: "crude|oil|opec|barrel|usd|dollar|energy|refiner|price|supply",
  lme: "metal|aluminium|copper|zinc|price|china|lme|supply|smelter",
  "grm": "refin|margin|diesel|crack|crude",
  "fii-flows": "india|nifty|sensex|equit|stock|market",
  "gold-price": "gold|bullion|price|mcx|rate|jewel",
  "bond-yields": "bond|yield|g-sec|gsec|treasury|rbi|omo|india",
  freight: "freight|shipping|container|red sea|vessel|rate|port|hormuz",
  "genai": "ai|software|it services|infosys|tcs|wipro|hcl|tech|pricing",
};
export const ctxFor = (d: Pick<Driver, "id" | "authority">): string | null => CTX_BY_ID[d.id] ?? CTX_BY_AUTHORITY[d.authority] ?? null;

type Scored = Evidence & { ms: number; score: number };

/** Short, searchable company name: strips legal suffixes. */
export const shortName = (name: string) =>
  name.replace(/\b(limited|ltd\.?|pvt\.?|private|inc\.?|corp\.?|corporation|india)\b/gi, " ").replace(/[.,]+/g, " ").replace(/\s+/g, " ").trim();

export function pickEvidence(items: NewsItem[], kw: string, now = Date.now(), opts: { company?: string | null; ctx?: string | null } = {}): DriverEvidence {
  const re = new RegExp(kw, "ig");
  const ctxRe = opts.ctx ? new RegExp(opts.ctx, "i") : null;
  const co = opts.company && opts.company.length >= 4 ? new RegExp(`\\b${opts.company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i") : null;
  const kept: Scored[] = [];
  const sigs: Set<string>[] = [];
  for (const it of items) {
    const { title, source } = splitTitle(it.title);
    if (NOISE.test(title) || (source && BLOCKED_SOURCE.test(source))) continue;
    if (ctxRe && !ctxRe.test(title)) continue;
    const hits = new Set((title.match(re) ?? []).map((h) => h.toLowerCase()));
    if (!hits.size) continue;
    const ms = newsPublishedAtMs(it.publishedAt);
    if (ms && now - ms > WINDOW_DAYS * 86_400_000) continue;
    const sig = words(title);
    if (sigs.some((s) => jaccard(s, sig) > 0.6)) continue; // same story, other outlet
    sigs.push(sig);
    const ageDays = ms ? Math.max(0, (now - ms) / 86_400_000) : WINDOW_DAYS;
    const isCo = !!co && co.test(title);
    const score = Math.min(hits.size, 3) + (source && TOP_SOURCE.test(source) ? 1 : 0) + 2 * Math.pow(0.5, ageDays / HALF_LIFE_DAYS) + (isCo ? 4 : 0);
    kept.push({ title, source, link: it.link, publishedAt: it.publishedAt ?? null, company: isCo || undefined, ms: ms || 0, score });
  }
  kept.sort((a, b) => b.score - a.score);
  const active = kept.some((h) => h.ms && now - h.ms <= ACTIVE_DAYS * 86_400_000 && h.score >= 2.5);
  return { items: kept.slice(0, 3).map(({ ms: _ms, score: _s, ...e }) => e), active, count: kept.length };
}

async function fetchItems(key: string, q: string): Promise<NewsItem[]> {
  try {
    const res = await feedFetch(rssUrl(q), { timeoutMs: 6_000, attempts: 1 });
    return res.ok ? parseRss(await res.text(), "googlenews", 30) : [];
  } catch {
    return [];
  }
}

const itemCache = new Map<string, { at: number; value: NewsItem[] }>();
const itemInflight = new Map<string, Promise<NewsItem[]>>();

/** Cached + de-duplicated raw feed fetch. Failures/empties are retried after 5 min rather than a full TTL. */
function feed(q: string): Promise<NewsItem[]> {
  const hit = itemCache.get(q);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  const running = itemInflight.get(q);
  if (running) return running;
  const p = fetchItems(q, q)
    .then((value) => {
      itemCache.set(q, { at: value.length ? Date.now() : Date.now() - TTL_MS + 5 * 60_000, value });
      return value;
    })
    .finally(() => itemInflight.delete(q));
  itemInflight.set(q, p);
  return p;
}

/** Headlines naming this company (all topics); cached per company. */
export const companyFeed = (name: string) => {
  const n = shortName(name);
  return n.length >= 4 ? feed(`"${n}"`) : Promise.resolve([] as NewsItem[]);
};

export async function evidenceFor(driver: Driver, company?: { name: string; feed: NewsItem[] }): Promise<DriverEvidence> {
  const ctx = ctxFor(driver);
  const sector = pickEvidence(await feed(driver.q), driver.kw, Date.now(), { ctx });
  if (!company?.feed.length) return sector;
  const co = pickEvidence(company.feed, driver.kw, Date.now(), { company: shortName(company.name), ctx });
  const own = co.items.filter((e) => e.company);
  if (!own.length) return sector;
  const seen = new Set(own.map((e) => e.link));
  const merged = [...own, ...sector.items.filter((e) => !seen.has(e.link))].slice(0, 3);
  return { items: merged, active: sector.active || co.active, count: Math.max(sector.count, merged.length) };
}

// Kept for tests that clear state.
export const _clearDriverNewsCache = () => {
  itemCache.clear();
};
