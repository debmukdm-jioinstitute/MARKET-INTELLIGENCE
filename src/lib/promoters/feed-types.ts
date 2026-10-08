import type { PromoterActivityType } from "@/lib/promoters/types";

export type PromoterFeedCollector = "google-news" | "nse-api" | "native" | "firecrawl" | "crawl4ai";

export type PromoterFeedChannel =
  | "NSE disclosures"
  | "BSE disclosures"
  | "Promoter & pledge"
  | "Bulk & block deals";

export type PromoterFeedCategory = PromoterActivityType | "DISCLOSURE";

export type PromoterFeedItem = {
  id: string;
  channel: PromoterFeedChannel;
  title: string;
  companyName: string | null;
  symbol: string | null;
  category: PromoterFeedCategory;
  transactionDate: string;
  sourceUrl: string;
  snippet: string | null;
  collector: PromoterFeedCollector;
};

export type PromoterFeedSnapshot = {
  items: PromoterFeedItem[];
  asOf: string;
  collectorsUsed: PromoterFeedCollector[];
  dataStatus: "AVAILABLE" | "UNAVAILABLE";
  message: string;
};
