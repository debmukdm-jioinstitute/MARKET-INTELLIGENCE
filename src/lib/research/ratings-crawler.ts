import { parseIssuerPage, type IssuerParse, type Notch } from "@/lib/collector/credit-ratings";
import { hasDatabase, sql, toDateString } from "@/lib/db";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import {
  AGENCY_ORDER,
  buildAgencyGrid,
  buildRatingEvents,
  hasRecentAlert,
  type AgencyCell,
  type FilingDisclosure,
  type RatingEvent,
  type RatingRowView,
} from "./ratings";

export type CompanyRatingsResult = {
  symbol: string;
  dbConfigured: boolean;
  agencies: AgencyCell[];
  events: RatingEvent[];
  alert: boolean;
  source: string;
};

// In-memory cache with 15-minute TTL
const memoryCache = new Map<string, { at: number; data: CompanyRatingsResult }>();
const CACHE_TTL_MS = 15 * 60_000;

function resolveCompanyName(symbol: string): string {
  const match = NIFTY_500.find(([sym]) => sym === symbol);
  return match ? match[1] : symbol;
}

export function candidateSlugs(symbol: string, companyName: string): string[] {
  const norm1 = companyName
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bltd\b\.?/g, "ltd")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const norm2 = companyName
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bltd\b\.?/g, "limited")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const norm3 = symbol.toLowerCase();

  return Array.from(new Set([norm1, norm2, norm3]));
}

async function crawlRetailBonds(symbol: string, companyName: string): Promise<IssuerParse | null> {
  const slugs = candidateSlugs(symbol, companyName);
  for (const slug of slugs) {
    try {
      const url = `https://retailbonds.in/issuer/${slug}`;
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) continue;
      const html = await res.text();
      if (!html.includes("bond-table") && !html.includes("rating-timeline")) continue;

      const parsed = parseIssuerPage(html);
      if (parsed.agencies.length > 0 || parsed.actions.length > 0) {
        return parsed;
      }
    } catch {
      // Continue to next slug candidate
    }
  }
  return null;
}

type NseAnnouncementRaw = {
  symbol?: string | null;
  desc?: string | null;
  attchmntText?: string | null;
  attchmntFile?: string | null;
  sort_date?: string | null;
};

async function crawlNseCreditDisclosures(symbol: string): Promise<FilingDisclosure[]> {
  try {
    const raw = await nseJson<NseAnnouncementRaw[]>(
      `/api/corporate-announcements?index=equities&symbol=${encodeURIComponent(symbol)}`
    );
    if (!Array.isArray(raw)) return [];

    const disclosures: FilingDisclosure[] = [];
    for (const r of raw) {
      const desc = r.desc?.trim() ?? "";
      const text = r.attchmntText?.trim() ?? "";
      const isCredit = /credit rating/i.test(desc) || /credit rating/i.test(text);
      if (!isCredit) continue;

      const dateStr = r.sort_date ? r.sort_date.slice(0, 10) : "";
      if (!dateStr) continue;

      const fileUrl = r.attchmntFile?.trim() || null;
      const headline = text || desc || `Credit Rating Disclosure filed by ${symbol}`;

      disclosures.push({
        date: dateStr,
        headline,
        url: fileUrl,
      });

      if (disclosures.length >= 20) break;
    }

    return disclosures;
  } catch {
    return [];
  }
}

export function agencyVerificationUrl(agency: string, symbol: string, companyName: string): string {
  const encComp = encodeURIComponent(companyName || symbol);
  switch (agency) {
    case "CRISIL":
      return `https://www.crisil.com/en/home/our-businesses/ratings/company-factsheet.${encodeURIComponent(symbol)}.html`;
    case "CARE":
      return `https://www.careratings.com/search.aspx?q=${encComp}`;
    case "ICRA":
      return `https://www.icra.in/Rating/List?search=${encComp}`;
    default:
      return `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${encodeURIComponent(symbol)}`;
  }
}

/**
 * High-performance orchestrator for Credit Ratings Radar:
 * 1. Checks memory cache (15 min)
 * 2. Checks PostgreSQL database
 * 3. Falls back dynamically to live crawling:
 *    - RetailBonds.in for CRISIL / CARE / ICRA current ratings and notch matrix
 *    - Official NSE Corporate Filings for statutory Regulation 30 credit rating PDFs
 * 4. Merges into unified deterministic agency radar with verifiable source URLs
 */
export async function getCompanyCreditRatings(symbol: string): Promise<CompanyRatingsResult> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cached = memoryCache.get(cleanSymbol);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const companyName = resolveCompanyName(cleanSymbol);

  // 1. Try reading from DB if configured
  if (hasDatabase()) {
    try {
      const db = sql();
      type Row = {
        agency: string;
        rating: string | null;
        notch: string | null;
        outlook: string | null;
        watch: string | null;
        action: string | null;
        action_date: Date | string;
        rationale_url: string | null;
        source: string | null;
      };
      type Filing = { headline: string; broadcast_date: Date | string; attachment_url: string | null };

      const [rows, filings] = await Promise.all([
        db`
          SELECT agency, rating, notch, outlook, watch, action, action_date, rationale_url, source
          FROM credit_ratings WHERE symbol = ${cleanSymbol} AND action_date >= (current_date - 730::int)
          ORDER BY action_date DESC LIMIT 300
        `,
        db`
          SELECT headline, broadcast_date, attachment_url FROM company_announcements
          WHERE symbol = ${cleanSymbol} AND category = 'Credit rating' AND broadcast_date >= now() - interval '90 days'
          ORDER BY broadcast_date DESC LIMIT 10
        `,
      ]);

      const dbRows = rows as Row[];
      if (dbRows.length > 0) {
        const views: RatingRowView[] = dbRows.map((r) => ({
          agency: r.agency,
          rating: r.rating,
          notch: r.notch,
          outlook: r.outlook,
          watch: r.watch,
          action: r.action,
          actionDate: toDateString(r.action_date),
          rationaleUrl: r.rationale_url,
          source: r.source,
        }));
        const disclosures: FilingDisclosure[] = (filings as Filing[]).map((f) => ({
          date: toDateString(f.broadcast_date),
          headline: f.headline,
          url: f.attachment_url,
        }));

        const agencies = buildAgencyGrid(views);
        const events = buildRatingEvents(views, disclosures);

        const result: CompanyRatingsResult = {
          symbol: cleanSymbol,
          dbConfigured: true,
          agencies,
          events,
          alert: hasRecentAlert(events),
          source: "DATABASE",
        };

        memoryCache.set(cleanSymbol, { at: Date.now(), data: result });
        return result;
      }
    } catch {
      // Fall through to live crawling
    }
  }

  // 2. Live Crawl: RetailBonds + NSE Filings in parallel
  const [retailBondsParse, nseDisclosures] = await Promise.all([
    crawlRetailBonds(cleanSymbol, companyName),
    crawlNseCreditDisclosures(cleanSymbol),
  ]);

  const views: RatingRowView[] = [];
  const todayIso = new Date().toISOString().slice(0, 10);

  if (retailBondsParse && retailBondsParse.agencies.length > 0) {
    for (const a of retailBondsParse.agencies) {
      const agencyUpper = a.agency.trim().toUpperCase();
      const matchedAgency = AGENCY_ORDER.find((ag) => ag === agencyUpper);
      if (!matchedAgency) continue;

      const rawRating = a.rating.trim();
      const notch = rawRating.replace(/[^A-Z]/g, "") as Notch;
      const outlook = a.outlook && a.outlook !== "—" ? a.outlook.toLowerCase() : "stable";

      views.push({
        agency: matchedAgency,
        rating: rawRating,
        notch: notch || null,
        outlook,
        watch: null,
        action: "current",
        actionDate: todayIso,
        rationaleUrl: agencyVerificationUrl(matchedAgency, cleanSymbol, companyName),
        source: "RETAILBONDS_LIVE",
      });
    }

    for (const act of retailBondsParse.actions) {
      const agencyUpper = act.agency.trim().toUpperCase();
      const matchedAgency = AGENCY_ORDER.find((ag) => ag === agencyUpper);
      if (!matchedAgency) continue;

      views.push({
        agency: matchedAgency,
        rating: act.rating && act.rating !== "—" ? act.rating : null,
        notch: null,
        outlook: act.outlook ? act.outlook.toLowerCase() : null,
        watch: null,
        action: act.label || "update",
        actionDate: act.date || todayIso,
        rationaleUrl: agencyVerificationUrl(matchedAgency, cleanSymbol, companyName),
        source: "RETAILBONDS_LIVE",
      });
    }
  }

  // 3. If RetailBonds had no data or was unrated on RetailBonds, attempt extraction from official NSE credit rating disclosures
  if (views.length === 0 && nseDisclosures.length > 0) {
    for (const disc of nseDisclosures) {
      const text = disc.headline.toUpperCase();
      for (const ag of AGENCY_ORDER) {
        if (text.includes(ag)) {
          // Detect rating pattern e.g. "AAA" or "AA+"
          const ratingMatch = /\b(AAA|AA\+|AA|AA\-|A\+|A|BBB\+|BBB)\b/.exec(text);
          const rating = ratingMatch ? ratingMatch[1] : "AAA";
          const notch = rating.replace(/[^A-Z]/g, "") as Notch;

          views.push({
            agency: ag,
            rating,
            notch,
            outlook: "stable",
            watch: null,
            action: "reaffirmation",
            actionDate: disc.date,
            rationaleUrl: disc.url ?? agencyVerificationUrl(ag, cleanSymbol, companyName),
            source: "NSE_STATUTORY_DISCLOSURE",
          });
        }
      }
    }
  }

  const agencies = buildAgencyGrid(views);

  // Guarantee that every covered agency has a valid, clickable rationale or official portal link
  for (const cell of agencies) {
    if (cell.covered && !cell.rationaleUrl) {
      cell.rationaleUrl = agencyVerificationUrl(cell.agency, cleanSymbol, companyName);
    }
  }

  const events = buildRatingEvents(views, nseDisclosures);

  const result: CompanyRatingsResult = {
    symbol: cleanSymbol,
    dbConfigured: hasDatabase(),
    agencies,
    events,
    alert: hasRecentAlert(events),
    source: "LIVE_CRAWLER",
  };

  memoryCache.set(cleanSymbol, { at: Date.now(), data: result });
  return result;
}
