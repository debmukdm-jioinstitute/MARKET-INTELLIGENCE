import type { MutualFund } from "./types";

export interface AmcDisclosureSource {
  amcId: string;
  amcName: string;
  websiteUrl: string;
  portfolioDisclosureUrl: string;
  factsheetsUrl: string;
  schemeDocumentsUrl: string; // SID / KIM
  monthlyDisclosureSchedule: string;
  sebiComplianceNote: string;
  supportedFormats: string[];
}

export const AMC_DISCLOSURE_SOURCES: AmcDisclosureSource[] = [
  {
    amcId: "ppfas",
    amcName: "PPFAS Mutual Fund (Parag Parikh)",
    websiteUrl: "https://amc.ppfas.com/",
    portfolioDisclosureUrl: "https://amc.ppfas.com/downloads/portfolio-disclosure/",
    factsheetsUrl: "https://amc.ppfas.com/downloads/factsheet/",
    schemeDocumentsUrl: "https://amc.ppfas.com/downloads/scheme-related-documents/",
    monthlyDisclosureSchedule: "By 10th of each month as per SEBI regulations",
    sebiComplianceNote: "SEBI/HO/IMD/DF2/CIR/P/2018/92 on Monthly Portfolio Disclosures",
    supportedFormats: ["Excel (.xlsx)", "PDF Factsheet", "Web Explorer"],
  },
  {
    amcId: "hdfc",
    amcName: "HDFC Mutual Fund",
    websiteUrl: "https://www.hdfcfund.com/",
    portfolioDisclosureUrl: "https://www.hdfcfund.com/statutory-disclosure/monthly-portfolio",
    factsheetsUrl: "https://www.hdfcfund.com/investor-desk/factsheets",
    schemeDocumentsUrl: "https://www.hdfcfund.com/statutory-disclosure/scheme-documents",
    monthlyDisclosureSchedule: "10th of every month (Fortnightly for debt)",
    sebiComplianceNote: "Full portfolio with ISIN, ratings, and weights",
    supportedFormats: ["Excel (.xls/.xlsx)", "CSV", "PDF"],
  },
  {
    amcId: "nippon",
    amcName: "Nippon India Mutual Fund",
    websiteUrl: "https://mf.nipponindiaim.com/",
    portfolioDisclosureUrl: "https://mf.nipponindiaim.com/investor-service/downloads/portfolio-disclosures",
    factsheetsUrl: "https://mf.nipponindiaim.com/investor-service/downloads/factsheets",
    schemeDocumentsUrl: "https://mf.nipponindiaim.com/investor-service/downloads/sid-kim",
    monthlyDisclosureSchedule: "10th of every calendar month",
    sebiComplianceNote: "Complete scheme holdings with market cap categorisation",
    supportedFormats: ["Excel (.xlsx)", "PDF"],
  },
  {
    amcId: "icici-pru",
    amcName: "ICICI Prudential Mutual Fund",
    websiteUrl: "https://www.icicipruamc.com/",
    portfolioDisclosureUrl: "https://www.icicipruamc.com/downloads/monthly-portfolio-disclosures",
    factsheetsUrl: "https://www.icicipruamc.com/downloads/factsheet",
    schemeDocumentsUrl: "https://www.icicipruamc.com/downloads/sid-and-kim",
    monthlyDisclosureSchedule: "By 10th of every month",
    sebiComplianceNote: "SEBI Master Circular for Mutual Funds",
    supportedFormats: ["Excel (.xlsx)", "PDF"],
  },
  {
    amcId: "quant",
    amcName: "Quant Mutual Fund",
    websiteUrl: "https://quantmutual.com/",
    portfolioDisclosureUrl: "https://quantmutual.com/statutory-disclosures",
    factsheetsUrl: "https://quantmutual.com/downloads/factsheet",
    schemeDocumentsUrl: "https://quantmutual.com/downloads/sid-kim",
    monthlyDisclosureSchedule: "Monthly portfolio disclosure within 10 days of month-end",
    sebiComplianceNote: "Quant VLRT framework disclosures",
    supportedFormats: ["Excel (.xlsx)", "PDF"],
  },
  {
    amcId: "sbi",
    amcName: "SBI Mutual Fund",
    websiteUrl: "https://www.sbimf.com/",
    portfolioDisclosureUrl: "https://www.sbimf.com/en-us/portfolios",
    factsheetsUrl: "https://www.sbimf.com/en-us/factsheets",
    schemeDocumentsUrl: "https://www.sbimf.com/en-us/sid-kim",
    monthlyDisclosureSchedule: "10th of every month",
    sebiComplianceNote: "Mandatory monthly portfolio publishing across all active schemes",
    supportedFormats: ["Excel (.xlsx)", "PDF", "CSV"],
  },
  {
    amcId: "mirae-asset",
    amcName: "Mirae Asset Mutual Fund",
    websiteUrl: "https://www.miraeassetmf.co.in/",
    portfolioDisclosureUrl: "https://www.miraeassetmf.co.in/downloads/portfolio",
    factsheetsUrl: "https://www.miraeassetmf.co.in/downloads/factsheet",
    schemeDocumentsUrl: "https://www.miraeassetmf.co.in/downloads/sid-kim",
    monthlyDisclosureSchedule: "10th of every month",
    sebiComplianceNote: "Monthly and half-yearly disclosures complying with SEBI directives",
    supportedFormats: ["Excel (.xlsx)", "PDF"],
  },
  {
    amcId: "motilal-oswal",
    amcName: "Motilal Oswal Mutual Fund",
    websiteUrl: "https://www.motilaloswalmf.com/",
    portfolioDisclosureUrl: "https://www.motilaloswalmf.com/downloads/mutual-fund/monthly-portfolio",
    factsheetsUrl: "https://www.motilaloswalmf.com/downloads/mutual-fund/factsheet",
    schemeDocumentsUrl: "https://www.motilaloswalmf.com/downloads/mutual-fund/sid-kim",
    monthlyDisclosureSchedule: "10th of every month",
    sebiComplianceNote: "QGLP framework disclosures with industry classification",
    supportedFormats: ["Excel (.xlsx)", "PDF"],
  },
  {
    amcId: "kotak",
    amcName: "Kotak Mahindra Mutual Fund",
    websiteUrl: "https://www.kotakmf.com/",
    portfolioDisclosureUrl: "https://www.kotakmf.com/downloads/portfolio-disclosures",
    factsheetsUrl: "https://www.kotakmf.com/downloads/factsheets",
    schemeDocumentsUrl: "https://www.kotakmf.com/downloads/sid-kim",
    monthlyDisclosureSchedule: "10th of every month",
    sebiComplianceNote: "SEBI/HO/IMD/DF2/CIR/P/2018/92 compliance",
    supportedFormats: ["Excel (.xlsx)", "PDF"],
  },
  {
    amcId: "uti",
    amcName: "UTI Mutual Fund",
    websiteUrl: "https://www.utimf.com/",
    portfolioDisclosureUrl: "https://www.utimf.com/forms-and-downloads/monthly-portfolio",
    factsheetsUrl: "https://www.utimf.com/forms-and-downloads/factsheet",
    schemeDocumentsUrl: "https://www.utimf.com/forms-and-downloads/sid-kim",
    monthlyDisclosureSchedule: "10th of every month",
    sebiComplianceNote: "SEBI mandate compliance",
    supportedFormats: ["Excel (.xlsx)", "PDF"],
  }
];

// AMFI NAV crawler cache
let navCache: { [amfiCode: string]: { nav: number; date: string; name: string } } = {};
let lastCacheTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function fetchAmfiNavs(): Promise<Record<string, { nav: number; date: string; name: string }>> {
  const now = Date.now();
  if (Object.keys(navCache).length > 0 && now - lastCacheTime < CACHE_TTL_MS) {
    return navCache;
  }

  try {
    const res = await fetch("https://www.amfiindia.com/spages/NAVAll.txt", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0)",
        Accept: "text/plain",
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      console.warn("AMFI fetch returned status:", res.status);
      return navCache;
    }

    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const parsed: Record<string, { nav: number; date: string; name: string }> = {};

    for (const line of lines) {
      if (!line || !line.includes(";")) continue;
      const parts = line.split(";");
      if (parts.length >= 6) {
        const code = parts[0]?.trim();
        const name = parts[3]?.trim();
        const navStr = parts[4]?.trim();
        const date = parts[5]?.trim();
        const nav = parseFloat(navStr);

        if (code && !isNaN(nav)) {
          parsed[code] = {
            nav,
            date: date || new Date().toISOString().slice(0, 10),
            name: name || "",
          };
        }
      }
    }

    if (Object.keys(parsed).length > 0) {
      navCache = parsed;
      lastCacheTime = now;
    }

    return navCache;
  } catch (err) {
    console.error("Failed to crawl AMFI NAVs:", err);
    return navCache;
  }
}

export async function getLatestNavForFund(amfiCode: string): Promise<{ nav: number; date: string } | null> {
  const allNavs = await fetchAmfiNavs();
  const entry = allNavs[amfiCode];
  if (entry) {
    return { nav: entry.nav, date: entry.date };
  }
  return null;
}
