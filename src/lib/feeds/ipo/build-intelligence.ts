import type { FieldSource } from "@/lib/feeds/india/types";
import { fetchProspectusText } from "@/lib/feeds/ipo/extract-prospectus-text";
import type { IpoIntelligence, IpoIntelField, IpoSourceLink } from "@/lib/feeds/ipo/intelligence-types";
import { parseProspectusText } from "@/lib/feeds/ipo/prospectus-parse";
import type { IpoDetail } from "@/lib/feeds/ipo/types";

const GMP_DISCLAIMER =
  "Unofficial grey-market premium (OTC). Not from NSE/BSE/registrar — can change intraday and is not a listing guarantee.";

const UPSTOX: FieldSource = {
  provider: "Upstox IPO calendar",
  url: "https://upstox.com/developer/api-documentation/open-api/ipo",
};

function catalogFor(detail: IpoDetail): IpoSourceLink[] {
  const q = encodeURIComponent(detail.name);
  return [
    {
      id: "sebi",
      label: "SEBI",
      url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=25&smid=35",
      role: "IPO regulatory filings and offer documents",
    },
    {
      id: "nse",
      label: "NSE",
      url: "https://www.nseindia.com/market-data/ipos-forthcoming",
      role: "Forthcoming / live IPO announcements",
    },
    {
      id: "bse",
      label: "BSE",
      url: "https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=0&txt_keyword=",
      role: "Public issue master and timelines",
    },
    {
      id: "nse-corp",
      label: "NSE announcements",
      url: `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${encodeURIComponent(detail.symbol)}`,
      role: "Exchange corporate announcements (when listed)",
    },
    {
      id: "drhp",
      label: "DRHP / RHP",
      url: detail.rhpUrl || detail.drhpUrl || "https://www.sebi.gov.in/",
      role: "Draft / red herring prospectus PDF",
    },
    {
      id: "registrar",
      label: "Registrar",
      url: detail.registrar?.website || "https://www.sebi.gov.in/",
      role: "Allotment, refunds, and issue FAQs",
    },
    {
      id: "company",
      label: "Issuer website",
      url: `https://www.google.com/search?q=${q}+IPO+investor+relations`,
      role: "Company IPO microsite (search — not crawled automatically yet)",
    },
  ];
}

function field<T>(
  value: T,
  coverage: IpoIntelField<T>["coverage"],
  source?: FieldSource,
  note?: string,
): IpoIntelField<T> {
  return { value, coverage, source, note };
}

export async function buildIpoIntelligence(detail: IpoDetail): Promise<IpoIntelligence> {
  const docUrl = detail.drhpUrl || detail.rhpUrl || null;
  let prospectusText = "";
  let prospectusError: string | undefined;
  if (docUrl) {
    const fetched = await fetchProspectusText(docUrl);
    prospectusText = fetched.text;
    prospectusError = fetched.error;
  } else {
    prospectusError = "No DRHP/RHP URL on calendar feed";
  }

  const parsed = parseProspectusText(prospectusText);
  const docSource: FieldSource = docUrl
    ? { provider: "DRHP/RHP document", url: docUrl }
    : { provider: "Prospectus", url: "https://www.sebi.gov.in/" };

  const refPrice =
    detail.cutOffPrice ??
    (detail.minPrice && detail.maxPrice ? (detail.minPrice + detail.maxPrice) / 2 : null);
  let listingGainPct: number | null = null;
  if (detail.listingPrice != null && refPrice != null && refPrice > 0) {
    listingGainPct = Number((((detail.listingPrice - refPrice) / refPrice) * 100).toFixed(2));
  }

  const gmpBundle =
    detail.gmpInr != null || detail.gmpPct != null
      ? {
          gmpInr: detail.gmpInr ?? null,
          gmpPct: detail.gmpPct ?? null,
          gmpSource: detail.gmpSource ?? null,
          disclaimer: GMP_DISCLAIMER,
        }
      : null;

  return {
    ipoId: detail.id,
    symbol: detail.symbol,
    name: detail.name,
    status: detail.status,
    fetchedAt: new Date().toISOString(),
    drhp: field(
      { url: detail.drhpUrl, label: "DRHP" },
      detail.drhpUrl ? "live" : "planned",
      detail.drhpUrl ? { provider: "Upstox / issuer", url: detail.drhpUrl } : UPSTOX,
      detail.drhpUrl ? undefined : "Link appears when Upstox publishes DRHP URL",
    ),
    rhp: field(
      { url: detail.rhpUrl, label: "RHP" },
      detail.rhpUrl ? "live" : "planned",
      detail.rhpUrl ? { provider: "Upstox / issuer", url: detail.rhpUrl } : UPSTOX,
    ),
    issueSize: field(detail.issueSize, "live", UPSTOX, "₹ crore — calendar feed"),
    freshIssue: field(
      parsed.freshIssueCr,
      parsed.freshIssueCr != null ? "partial" : prospectusText.length > 400 ? "partial" : "planned",
      docSource,
      parsed.freshIssueCr == null ? "Parse DRHP/RHP or wait for structured issue break-up feed" : undefined,
    ),
    ofs: field(
      parsed.ofsCr,
      parsed.ofsCr != null ? "partial" : "planned",
      docSource,
      parsed.ofsCr == null ? "Offer-for-sale size in prospectus Objects / Issue structure" : undefined,
    ),
    promoters: field(
      parsed.promoterSnippet,
      parsed.promoterSnippet ? "partial" : "planned",
      docSource,
      "Full promoter table in DRHP — automated crawl of company/registrar sites planned",
    ),
    valuation: field(
      parsed.valuationSnippet,
      parsed.valuationSnippet ? "partial" : "planned",
      docSource,
    ),
    peerValuation: field(
      parsed.peerSnippet,
      parsed.peerSnippet ? "partial" : "planned",
      docSource,
      "Peer multiples in Industry Overview — lead-manager research not auto-ingested yet",
    ),
    financials: field(
      parsed.financialSnippet,
      parsed.financialSnippet ? "partial" : "planned",
      docSource,
    ),
    risks: field(
      parsed.riskBullets,
      parsed.riskBullets.length ? "partial" : "planned",
      docSource,
      parsed.riskBullets.length ? undefined : "Risk Factors section extract failed or PDF is image-only",
    ),
    objectsOfIssue: field(
      parsed.objectBullets,
      parsed.objectBullets.length ? "partial" : "planned",
      docSource,
    ),
    anchorInvestors: field(
      parsed.anchorSnippet,
      parsed.anchorSnippet ? "partial" : "planned",
      docSource,
      "Anchor book published pre-listing on exchange announcements when available",
    ),
    subscription: field(
      detail.totalSubscription ? `${detail.totalSubscription}x` : null,
      detail.totalSubscription ? "live" : "partial",
      UPSTOX,
      detail.totalSubscription ? undefined : "Live subscription during bidding — refresh calendar feed",
    ),
    gmp: field(
      gmpBundle,
      gmpBundle ? "partial" : "planned",
      detail.gmpSource ?? { provider: "Chittorgarh / IPO Watch", url: "https://www.chittorgarh.com/" },
      GMP_DISCLAIMER,
    ),
    listingPerformance: field(
      detail.listingPrice != null
        ? {
            listingPrice: detail.listingPrice,
            referencePrice: refPrice,
            listingGainPct,
            listingDate: detail.timeline.listingDate ?? null,
          }
        : null,
      detail.listingPrice != null ? "live" : detail.status === "listed" ? "partial" : "planned",
      UPSTOX,
    ),
    leadManagers: field(
      parsed.leadManagerSnippet,
      parsed.leadManagerSnippet ? "partial" : "planned",
      docSource,
      "Lead-manager websites not crawled — names in prospectus cover page",
    ),
    registrar: field(
      detail.registrar
        ? { name: detail.registrar.name, website: detail.registrar.website ?? null }
        : null,
      detail.registrar ? "live" : "planned",
      detail.registrar?.website
        ? { provider: detail.registrar.name, url: detail.registrar.website }
        : UPSTOX,
    ),
    sourceCatalog: catalogFor(detail),
    prospectusExtractChars: prospectusText.length,
    prospectusError,
  };
}

export function compactIpoIntelligenceForMcp(intel: IpoIntelligence) {
  return {
    ipoId: intel.ipoId,
    name: intel.name,
    symbol: intel.symbol,
    status: intel.status,
    fetchedAt: intel.fetchedAt,
    issueSizeCr: intel.issueSize.value,
    freshIssueCr: intel.freshIssue.value,
    ofsCr: intel.ofs.value,
    subscription: intel.subscription.value,
    gmpInr: intel.gmp.value?.gmpInr ?? null,
    gmpPct: intel.gmp.value?.gmpPct ?? null,
    drhpUrl: intel.drhp.value.url,
    rhpUrl: intel.rhp.value.url,
    risks: intel.risks.value.slice(0, 5),
    objectsOfIssue: intel.objectsOfIssue.value.slice(0, 4),
    listingGainPct: intel.listingPerformance.value?.listingGainPct ?? null,
    sourceCatalog: intel.sourceCatalog.map((s) => ({ id: s.id, label: s.label, url: s.url })),
  };
}
