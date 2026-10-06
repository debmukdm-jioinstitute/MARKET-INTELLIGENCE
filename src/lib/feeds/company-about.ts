export type CompanyAbout = {
  title: string;
  description: string | null;
  extract: string;
  url: string;
  thumbnail: string | null;
  source: "Wikipedia" | "Screener.in";
};

export type AboutHints = { isin?: string | null; symbol?: string | null; market?: "IN" | "US" | string | null };

const COMPANY_RE =
  /company|conglomerate|bank|corporation|multinational|manufacturer|provider|firm|retailer|group|enterprise|insurer|miner|producer|airline|brand|developer|operator|utility|lender|holding/i;

const UA = { "User-Agent": "MarketIntelligence/1.0 (getmarketintelligence.in)" };
const cache = new Map<string, { at: number; value: CompanyAbout | null }>();
const TTL_MS = 24 * 60 * 60 * 1000;

function cleanName(name: string): string {
  return name
    .replace(/\b(limited|ltd\.?|inc\.?|corp\.?|corporation|plc|co\.?|pvt\.?|private)\b/gi, "")
    .replace(/[.,]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const norm = (s: string) => cleanName(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const INDIA_RE = /india|mumbai|delhi|bengaluru|bangalore|chennai|hyderabad|kolkata|pune|gurugram|gurgaon|noida|ahmedabad/i;

type Summary = { title: string; description?: string; extract?: string; thumbnail?: { source?: string }; content_urls?: { desktop?: { page?: string } } };

async function wikiSummary(title: string): Promise<CompanyAbout | null> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, { headers: UA, next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const j = (await res.json()) as Summary;
  if (!j.extract) return null;
  return { title: j.title, description: j.description ?? null, extract: j.extract, url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, thumbnail: j.thumbnail?.source ?? null, source: "Wikipedia" };
}

/** Exact entity match: the company's ISIN is stored on its Wikidata item, which links to its Wikipedia article. */
async function wikipediaByIsin(isin: string): Promise<CompanyAbout | null> {
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) return null;
  const query = `SELECT ?art WHERE { ?co wdt:P946 "${isin}" . ?art schema:about ?co ; schema:isPartOf <https://en.wikipedia.org/> } LIMIT 1`;
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { ...UA, Accept: "application/sparql-results+json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const url = ((await res.json()) as { results: { bindings: { art?: { value: string } }[] } }).results.bindings[0]?.art?.value;
  const title = url ? decodeURIComponent(url.split("/wiki/")[1] ?? "") : "";
  return title ? wikiSummary(title) : null;
}

const decodeHtml = (s: string) => s.replace(/<sup>[\s\S]*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Company-written business description from Screener (covers new listings and small caps Wikipedia lacks). */
async function screenerAbout(symbol: string): Promise<CompanyAbout | null> {
  for (const path of ["consolidated/", ""]) {
    const res = await fetch(`https://www.screener.in/company/${encodeURIComponent(symbol)}/${path}`, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36" }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (!res?.ok) continue;
    const html = await res.text();
    const about = /<div class="sub show-more-box about"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1];
    const overview = /<strong>Business Overview<\/strong>[\s\S]*?<br>([\s\S]*?)<\/p>/.exec(html)?.[1];
    const text = [about, overview].filter(Boolean).map((x) => decodeHtml(x!)).filter((x) => x.length > 40).join(" ");
    if (text) return { title: symbol, description: "Business description (company filings, via Screener)", extract: text.slice(0, 900), url: `https://www.screener.in/company/${encodeURIComponent(symbol)}/`, thumbnail: null, source: "Screener.in" };
  }
  return null;
}

/** Name search is the last resort and must pass strict identity checks; a missing blurb beats a wrong one. */
async function wikipediaByName(name: string, market: string): Promise<CompanyAbout | null> {
  const q = cleanName(name);
  const wanted = norm(name);
  if (!wanted) return null;
  const search = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(q)}&limit=5`, { headers: UA, next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!search.ok) return null;
  const { pages = [] } = (await search.json()) as { pages?: { title: string; description?: string | null }[] };
  for (const p of pages) {
    const t = norm(p.title);
    // Title must be the company name itself (exact, or the name plus a corporate/country suffix), never merely related.
    if (!(t === wanted || t.startsWith(`${wanted} `) || wanted.startsWith(`${t} `)) || !p.description || !COMPANY_RE.test(p.description)) continue;
    const about = await wikiSummary(p.title);
    if (!about) continue;
    if (market === "IN" && !INDIA_RE.test(`${about.description ?? ""} ${about.extract.slice(0, 500)}`)) continue;
    return about;
  }
  return null;
}

/** Verified company blurb: ISIN-exact Wikipedia, then company filings via Screener (India), then strict name match, else nothing. */
export async function fetchCompanyAbout(name: string, hints: AboutHints = {}): Promise<CompanyAbout | null> {
  const market = hints.market === "US" ? "US" : "IN";
  const key = `${hints.isin ?? ""}|${hints.symbol ?? ""}|${name}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: CompanyAbout | null = null;
  try { if (hints.isin) value = await wikipediaByIsin(hints.isin); } catch { value = null; }
  if (!value && market === "IN" && hints.symbol) { try { value = await screenerAbout(hints.symbol); } catch { value = null; } }
  if (!value) { try { value = await wikipediaByName(name, market); } catch { value = null; } }
  cache.set(key, { at: Date.now(), value });
  return value;
}
