import type { CreditRatingAgency } from "@/lib/credit/types";

export type CreditAgencySource = {
  agency: CreditRatingAgency;
  /** Google News RSS discovery — fast, no JS render. */
  rssQuery: string;
  host: string;
  listingUrl: string;
  portalUrl: string;
};

export const CREDIT_AGENCY_SOURCES: CreditAgencySource[] = [
  {
    agency: "CRISIL",
    rssQuery: "site:crisilratings.com (rating OR downgrade OR upgrade OR outlook OR watch)",
    host: "crisilratings.com",
    listingUrl: "https://www.crisilratings.com/en/home/newsroom/press-releases.html",
    portalUrl: "https://www.crisilratings.com/en/home/our-businesses/ratings.html",
  },
  {
    agency: "ICRA",
    rssQuery: "site:icra.in (rating OR downgrade OR upgrade OR outlook)",
    host: "icra.in",
    listingUrl: "https://www.icra.in/Rating/GetRatingList",
    portalUrl: "https://www.icra.in/",
  },
  {
    agency: "CARE Ratings",
    rssQuery: "site:careratings.com (rating OR downgrade OR upgrade OR outlook)",
    host: "careratings.com",
    listingUrl: "https://www.careratings.com/upload/CompanyFiles/PR/",
    portalUrl: "https://www.careratings.com/",
  },
  {
    agency: "India Ratings",
    rssQuery: "site:indiaratings.co.in (rating OR downgrade OR upgrade OR outlook)",
    host: "indiaratings.co.in",
    listingUrl: "https://www.indiaratings.co.in/pressrelease",
    portalUrl: "https://www.indiaratings.co.in/",
  },
  {
    agency: "Acuité",
    rssQuery: "site:acuite.in (rating OR downgrade OR upgrade OR outlook)",
    host: "acuite.in",
    listingUrl: "https://www.acuite.in/press-releases",
    portalUrl: "https://www.acuite.in/",
  },
  {
    agency: "Brickwork",
    rssQuery: "site:brickworkratings.com (rating OR downgrade OR upgrade OR outlook)",
    host: "brickworkratings.com",
    listingUrl: "https://www.brickworkratings.com/PressRelease.aspx",
    portalUrl: "https://www.brickworkratings.com/",
  },
];
