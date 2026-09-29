import type { CreditRatingAgency } from "@/lib/credit/types";
import type { PromoterActivityRecord, PromoterActivityType } from "@/lib/promoters/types";

export type VerificationLink = {
  href: string;
  label: string;
};

const CREDIT_AGENCY_PORTALS: Record<CreditRatingAgency, string> = {
  CRISIL: "https://www.crisilratings.com/en/home/our-businesses/ratings.html",
  ICRA: "https://www.icra.in/",
  "CARE Ratings": "https://www.careratings.com/",
  "India Ratings": "https://www.indiaratings.co.in/",
  Acuité: "https://www.acuite.in/",
  Brickwork: "https://www.brickworkratings.com/",
};

const REGULATION_PORTALS: Record<PromoterActivityRecord["sourceRegulation"], string> = {
  "SEBI PIT Reg 7(2)":
    "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
  "SEBI SAST Reg 29":
    "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
  "SEBI SAST Reg 31 (Pledge)":
    "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
  "NSE Block Window": "https://www.nseindia.com/market-data/block-deal-watch",
  "NSE Bulk Window": "https://www.nseindia.com/market-data/bulk-deal-watch",
};

export const CREDIT_RISK_PANEL_SOURCES: VerificationLink[] = [
  { href: "https://www.crisilratings.com/en/home/our-businesses/ratings.html", label: "CRISIL" },
  { href: "https://www.icra.in/", label: "ICRA" },
  { href: "https://www.careratings.com/", label: "CARE" },
  { href: "https://www.indiaratings.co.in/", label: "India Ratings" },
  { href: "https://www.sebi.gov.in/", label: "SEBI" },
];

export const PROMOTER_RISK_PANEL_SOURCES: VerificationLink[] = [
  {
    href: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
    label: "NSE insider / SAST",
  },
  {
    href: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
    label: "NSE pledge / SHP",
  },
  { href: "https://www.bseindia.com/corporates/Insider_Trading.aspx", label: "BSE insider" },
  { href: "https://www.sebi.gov.in/", label: "SEBI" },
];

export function creditAgencyPortalUrl(agency: CreditRatingAgency): string {
  return CREDIT_AGENCY_PORTALS[agency] ?? "https://www.sebi.gov.in/";
}

export function nseCorporateFilingsUrl(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  return `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${encodeURIComponent(s)}`;
}

export function regulationPortalUrl(
  regulation: PromoterActivityRecord["sourceRegulation"],
): string {
  return REGULATION_PORTALS[regulation] ?? PROMOTER_RISK_PANEL_SOURCES[0].href;
}

export function creditEventVerificationLink(input: {
  symbol: string;
  agency: CreditRatingAgency;
  sourceUrl?: string;
  actionDate?: string;
}): VerificationLink {
  if (input.sourceUrl) {
    return {
      href: input.sourceUrl,
      label: input.actionDate
        ? `${input.agency} release (${input.actionDate})`
        : `${input.agency} rating release`,
    };
  }
  return {
    href: creditAgencyPortalUrl(input.agency),
    label: `Verify on ${input.agency}`,
  };
}

export function promoterActivityVerificationLinks(
  symbol: string,
  activities: PromoterActivityRecord[],
  preferredCategory?: PromoterActivityType,
): VerificationLink[] {
  const links: VerificationLink[] = [];
  const seen = new Set<string>();

  const push = (link: VerificationLink) => {
    if (seen.has(link.href)) return;
    seen.add(link.href);
    links.push(link);
  };

  const prioritized = preferredCategory
    ? [...activities].sort((a, b) =>
        a.category === preferredCategory ? -1 : b.category === preferredCategory ? 1 : 0,
      )
    : activities;

  for (const act of prioritized) {
    if (act.sourceUrl) {
      push({
        href: act.sourceUrl,
        label: `${act.sourceRegulation} · ${act.reportingDate}`,
      });
    }
  }

  const primary = prioritized[0];
  if (primary) {
    push({
      href: regulationPortalUrl(primary.sourceRegulation),
      label: `${primary.exchange} regulatory portal`,
    });
  }

  push({
    href: nseCorporateFilingsUrl(symbol),
    label: `NSE filings · ${symbol.toUpperCase()}`,
  });

  return links.slice(0, 3);
}
