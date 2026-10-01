import type { PromoterFeedChannel } from "@/lib/promoters/feed-types";

export type PromoterDisclosureSource = {
  channel: PromoterFeedChannel;
  rssQuery: string;
  host: string;
  listingUrl: string;
  portalUrl: string;
};

export const PROMOTER_DISCLOSURE_SOURCES: PromoterDisclosureSource[] = [
  {
    channel: "NSE disclosures",
    rssQuery: "site:nseindia.com (insider OR SAST OR \"shareholding pattern\" OR pledge)",
    host: "nseindia.com",
    listingUrl: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
    portalUrl: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
  },
  {
    channel: "BSE disclosures",
    rssQuery: "site:bseindia.com (insider OR SAST OR pledge OR \"share holding\")",
    host: "bseindia.com",
    listingUrl: "https://www.bseindia.com/corporates/Insider_Trading.aspx",
    portalUrl: "https://www.bseindia.com/corporates/Insider_Trading.aspx",
  },
  {
    channel: "Promoter & pledge",
    rssQuery: "India (promoter selling OR promoter buying OR pledge shares OR \"promoter stake\")",
    host: "nseindia.com",
    listingUrl: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
    portalUrl: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
  },
  {
    channel: "Bulk & block deals",
    rssQuery: "India (\"bulk deal\" OR \"block deal\" OR NSE block window)",
    host: "nseindia.com",
    listingUrl: "https://www.nseindia.com/market-data/block-deal-watch",
    portalUrl: "https://www.nseindia.com/market-data/bulk-deal-watch",
  },
];
