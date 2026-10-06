export type CompanyAbout = {
  title: string;
  description: string | null;
  extract: string;
  url: string;
  thumbnail: string | null;
  source: "Wikipedia";
};

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

/** Free company blurb from Wikipedia REST (no API key, does not touch Upstox quota). */
export async function fetchCompanyAbout(name: string): Promise<CompanyAbout | null> {
  const q = cleanName(name);
  if (!q) return null;
  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: CompanyAbout | null = null;
  try {
    const search = await fetch(
      `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(q)}&limit=5`,
      { headers: UA, next: { revalidate: 86400 } },
    );
    if (search.ok) {
      const { pages = [] } = (await search.json()) as {
        pages?: { title: string; description?: string | null }[];
      };
      const pick = pages.find((p) => p.description && COMPANY_RE.test(p.description));
      if (pick) {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pick.title.replace(/ /g, "_"))}`,
          { headers: UA, next: { revalidate: 86400 } },
        );
        if (res.ok) {
          const j = (await res.json()) as {
            title: string;
            description?: string;
            extract?: string;
            thumbnail?: { source?: string };
            content_urls?: { desktop?: { page?: string } };
          };
          if (j.extract) {
            value = {
              title: j.title,
              description: j.description ?? null,
              extract: j.extract,
              url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(pick.title)}`,
              thumbnail: j.thumbnail?.source ?? null,
              source: "Wikipedia",
            };
          }
        }
      }
    }
  } catch {
    value = null;
  }
  cache.set(q, { at: Date.now(), value });
  return value;
}
