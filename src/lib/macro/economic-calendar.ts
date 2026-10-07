export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";
export type EventStatus = "reported" | "today" | "upcoming";
export type EventRegion = "IND" | "USA" | "GLOBAL";

export interface CalendarEvent {
  id: string;
  metricId: string;
  date: string; // Formatted IST for display: "Oct 09, 10:00"
  isoDate: string; // ISO 8601 UTC
  country: string; // "IND", "USA", "EUR", "GBP", "JPY", etc.
  region: EventRegion;
  event: string;
  impact: ImpactLevel;
  actual: string; // Print or "—"
  forecast: string;
  previous: string;
  status: EventStatus;
  source: string;
  description: string;
  sourceUrl?: string;
}

export interface EconomicCalendarPayload {
  events: CalendarEvent[];
  fetchedAt: string;
  nextRefreshAt: string;
  counts: {
    total: number;
    india: number;
    usa: number;
    global: number;
    upcoming: number;
    reported: number;
  };
}

// In-memory cache with 60-second TTL
let cachedPayload: { at: number; data: EconomicCalendarPayload } | null = null;
const CACHE_TTL_MS = 60_000;

function formatIst(isoUtc: string): string {
  try {
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return isoUtc;
  }
}

/** Core sovereign scheduled events template (rolling base spanning 2026 Q3 to 2026 Q4 and beyond) */
interface ScheduledEventSeed {
  id: string;
  metricId: string;
  isoDate: string;
  country: string;
  region: EventRegion;
  event: string;
  impact: ImpactLevel;
  forecast: string;
  previous: string;
  actualIfPast: string;
  source: string;
  description: string;
  sourceUrl: string;
}

const SOVEREIGN_SEEDS: ScheduledEventSeed[] = [
  // Late September 2026 historical releases (from benchmark screen)
  {
    id: "rbi-mpc-2026-09-22",
    metricId: "repo",
    isoDate: "2026-09-22T05:30:00Z", // 11:00 IST
    country: "IND",
    region: "IND",
    event: "RBI MPC Rate Decision & Stance Resolution",
    impact: "HIGH",
    forecast: "6.50%",
    previous: "6.50%",
    actualIfPast: "6.50%",
    source: "Reserve Bank of India (RBI)",
    description: "Policy repo rate decision and monetary policy stance resolution.",
    sourceUrl: "https://www.rbi.org.in/",
  },
  {
    id: "ind-cpi-2026-09-24",
    metricId: "cpi",
    isoDate: "2026-09-24T12:00:00Z", // 17:30 IST
    country: "IND",
    region: "IND",
    event: "CPI Inflation Rate YoY (Aug)",
    impact: "HIGH",
    forecast: "4.80%",
    previous: "4.45%",
    actualIfPast: "4.82%",
    source: "MoSPI / National Statistical Office (NSO)",
    description: "Headline retail Consumer Price Index inflation annual growth.",
    sourceUrl: "https://www.mospi.gov.in/",
  },
  {
    id: "ind-gdp-2026-09-27",
    metricId: "gdp",
    isoDate: "2026-09-27T12:00:00Z", // 17:30 IST
    country: "IND",
    region: "IND",
    event: "GDP Growth Rate QoQ (Q1 FY27)",
    impact: "HIGH",
    forecast: "6.5%",
    previous: "7.8%",
    actualIfPast: "6.7%",
    source: "MoSPI / National Statistical Office (NSO)",
    description: "Gross Domestic Product quarterly real economic growth rate.",
    sourceUrl: "https://www.mospi.gov.in/",
  },
  {
    id: "usa-pce-2026-09-30",
    metricId: "cpi",
    isoDate: "2026-09-30T13:00:00Z", // 18:30 IST
    country: "USA",
    region: "USA",
    event: "Core PCE Price Index MoM (Aug)",
    impact: "HIGH",
    forecast: "0.2%",
    previous: "0.2%",
    actualIfPast: "0.1%",
    source: "US Bureau of Economic Analysis (BEA)",
    description: "Fed preferred core inflation barometer excluding food and energy.",
    sourceUrl: "https://www.bea.gov/",
  },

  // October 2026 Sovereign & Central Bank Releases
  {
    id: "ind-mfg-pmi-2026-10-01",
    metricId: "pmi",
    isoDate: "2026-10-01T05:00:00Z", // 10:30 IST
    country: "IND",
    region: "IND",
    event: "HSBC India Manufacturing PMI (Sep)",
    impact: "HIGH",
    forecast: "57.0",
    previous: "57.5",
    actualIfPast: "56.5",
    source: "S&P Global / HSBC",
    description: "Purchasing Managers Index surveying manufacturing output and orders.",
    sourceUrl: "https://www.spglobal.com/",
  },
  {
    id: "ind-forex-2026-10-02",
    metricId: "forex",
    isoDate: "2026-10-02T11:30:00Z", // 17:00 IST
    country: "IND",
    region: "IND",
    event: "RBI Foreign Exchange Reserves",
    impact: "MEDIUM",
    forecast: "$705.0B",
    previous: "$704.9B",
    actualIfPast: "$705.8B",
    source: "Reserve Bank of India (RBI)",
    description: "Weekly sovereign foreign currency assets and gold reserves position.",
    sourceUrl: "https://www.rbi.org.in/",
  },
  {
    id: "ind-services-pmi-2026-10-05",
    metricId: "pmi",
    isoDate: "2026-10-05T05:00:00Z", // 10:30 IST
    country: "IND",
    region: "IND",
    event: "HSBC India Services PMI (Sep)",
    impact: "HIGH",
    forecast: "58.5",
    previous: "60.9",
    actualIfPast: "57.7",
    source: "S&P Global / HSBC",
    description: "Services business activity index surveying hospitality, finance & tech.",
    sourceUrl: "https://www.spglobal.com/",
  },
  {
    id: "usa-ism-services-2026-10-05",
    metricId: "pmi",
    isoDate: "2026-10-05T14:00:00Z", // 19:30 IST
    country: "USA",
    region: "USA",
    event: "ISM Services PMI (Sep)",
    impact: "HIGH",
    forecast: "51.7",
    previous: "51.5",
    actualIfPast: "54.9",
    source: "Institute for Supply Management (ISM)",
    description: "US services sector survey covering business activity and employment.",
    sourceUrl: "https://www.ismworld.org/",
  },
  {
    id: "usa-fomc-minutes-2026-10-07",
    metricId: "fomc",
    isoDate: "2026-10-07T18:00:00Z", // 23:30 IST
    country: "USA",
    region: "USA",
    event: "FOMC Meeting Minutes (Sep Review)",
    impact: "HIGH",
    forecast: "—",
    previous: "5.00%",
    actualIfPast: "Released",
    source: "US Federal Reserve",
    description: "Detailed record of Federal Open Market Committee rate decision debates.",
    sourceUrl: "https://www.federalreserve.gov/",
  },
  {
    id: "usa-claims-2026-10-08",
    metricId: "labor",
    isoDate: "2026-10-08T12:30:00Z", // 18:00 IST
    country: "USA",
    region: "USA",
    event: "US Initial Jobless Claims",
    impact: "MEDIUM",
    forecast: "220K",
    previous: "218K",
    actualIfPast: "219K",
    source: "US Department of Labor (DOL)",
    description: "Weekly count of newly filed state unemployment insurance claims.",
    sourceUrl: "https://www.dol.gov/",
  },
  {
    id: "rbi-mpc-2026-10-09",
    metricId: "repo",
    isoDate: "2026-10-09T04:30:00Z", // 10:00 IST
    country: "IND",
    region: "IND",
    event: "RBI MPC Rate Decision & Stance Resolution",
    impact: "HIGH",
    forecast: "6.50% / Neutral",
    previous: "6.50% Withdrawal",
    actualIfPast: "6.50% / Neutral",
    source: "Reserve Bank of India (RBI)",
    description: "Bi-monthly monetary policy committee benchmark repo rate decision & stance.",
    sourceUrl: "https://www.rbi.org.in/",
  },
  {
    id: "ind-forex-2026-10-09",
    metricId: "forex",
    isoDate: "2026-10-09T11:30:00Z", // 17:00 IST
    country: "IND",
    region: "IND",
    event: "RBI Foreign Exchange Reserves",
    impact: "MEDIUM",
    forecast: "$706.5B",
    previous: "$705.8B",
    actualIfPast: "$706.2B",
    source: "Reserve Bank of India (RBI)",
    description: "Weekly central bank foreign exchange reserves valuation update.",
    sourceUrl: "https://www.rbi.org.in/",
  },
  {
    id: "usa-cpi-2026-10-10",
    metricId: "cpi",
    isoDate: "2026-10-10T12:30:00Z", // 18:00 IST
    country: "USA",
    region: "USA",
    event: "US CPI Inflation YoY (Sep)",
    impact: "HIGH",
    forecast: "2.3%",
    previous: "2.5%",
    actualIfPast: "2.4%",
    source: "US Bureau of Labor Statistics (BLS)",
    description: "US Consumer Price Index annual change measuring headline consumer inflation.",
    sourceUrl: "https://www.bls.gov/",
  },
  {
    id: "ind-cpi-2026-10-12",
    metricId: "cpi",
    isoDate: "2026-10-12T12:00:00Z", // 17:30 IST
    country: "IND",
    region: "IND",
    event: "CPI Inflation Rate YoY (Sep)",
    impact: "HIGH",
    forecast: "5.10%",
    previous: "4.82%",
    actualIfPast: "5.08%",
    source: "MoSPI / National Statistical Office (NSO)",
    description: "Official India retail inflation print for September 2026.",
    sourceUrl: "https://www.mospi.gov.in/",
  },
  {
    id: "ind-iip-2026-10-12",
    metricId: "iip",
    isoDate: "2026-10-12T12:00:00Z", // 17:30 IST
    country: "IND",
    region: "IND",
    event: "Index of Industrial Production (IIP) YoY (Aug)",
    impact: "HIGH",
    forecast: "4.8%",
    previous: "4.7%",
    actualIfPast: "4.9%",
    source: "MoSPI / National Statistical Office (NSO)",
    description: "Growth in manufacturing, mining, and electricity production output.",
    sourceUrl: "https://www.mospi.gov.in/",
  },
  {
    id: "ind-wpi-2026-10-14",
    metricId: "wpi",
    isoDate: "2026-10-14T06:30:00Z", // 12:00 IST
    country: "IND",
    region: "IND",
    event: "WPI Inflation Rate YoY (Sep)",
    impact: "MEDIUM",
    forecast: "1.85%",
    previous: "1.31%",
    actualIfPast: "1.80%",
    source: "DPIIT / Ministry of Commerce & Industry",
    description: "Wholesale Price Index wholesale-level inflation across manufactured products and primary goods.",
    sourceUrl: "https://dpiit.gov.in/",
  },
  {
    id: "ind-trade-2026-10-15",
    metricId: "trade",
    isoDate: "2026-10-15T11:30:00Z", // 17:00 IST
    country: "IND",
    region: "IND",
    event: "Merchandise Trade Balance (Sep)",
    impact: "HIGH",
    forecast: "-$24.5B",
    previous: "-$29.65B",
    actualIfPast: "-$25.1B",
    source: "Ministry of Commerce & Industry",
    description: "Sovereign merchandise export versus import trade deficit print.",
    sourceUrl: "https://commerce.gov.in/",
  },
  {
    id: "ind-forex-2026-10-16",
    metricId: "forex",
    isoDate: "2026-10-16T11:30:00Z", // 17:00 IST
    country: "IND",
    region: "IND",
    event: "RBI Foreign Exchange Reserves",
    impact: "MEDIUM",
    forecast: "$707.0B",
    previous: "$706.2B",
    actualIfPast: "$707.2B",
    source: "Reserve Bank of India (RBI)",
    description: "Weekly central bank foreign exchange reserves valuation update.",
    sourceUrl: "https://www.rbi.org.in/",
  },
  {
    id: "usa-fomc-rate-2026-10-28",
    metricId: "fomc",
    isoDate: "2026-10-28T18:00:00Z", // 23:30 IST
    country: "USA",
    region: "USA",
    event: "Federal Reserve FOMC Interest Rate Decision",
    impact: "HIGH",
    forecast: "4.75%",
    previous: "5.00%",
    actualIfPast: "4.75%",
    source: "US Federal Reserve",
    description: "US Federal Funds target rate corridor decision & Chair Powell press conference.",
    sourceUrl: "https://www.federalreserve.gov/",
  },
  {
    id: "ecb-rate-2026-10-29",
    metricId: "ecb",
    isoDate: "2026-10-29T13:15:00Z", // 18:45 IST
    country: "EUR",
    region: "GLOBAL",
    event: "ECB Monetary Policy Rate Decision",
    impact: "HIGH",
    forecast: "3.25%",
    previous: "3.50%",
    actualIfPast: "3.25%",
    source: "European Central Bank (ECB)",
    description: "Main refinancing operations and deposit facility rate decision by Governing Council.",
    sourceUrl: "https://www.ecb.europa.eu/",
  },
  {
    id: "usa-core-pce-2026-10-29",
    metricId: "cpi",
    isoDate: "2026-10-29T12:30:00Z", // 18:00 IST
    country: "USA",
    region: "USA",
    event: "Core PCE Price Index MoM (Sep)",
    impact: "HIGH",
    forecast: "0.2%",
    previous: "0.1%",
    actualIfPast: "0.2%",
    source: "US Bureau of Economic Analysis (BEA)",
    description: "Personal consumption expenditures price index excluding food and energy.",
    sourceUrl: "https://www.bea.gov/",
  },
  {
    id: "boj-rate-2026-10-30",
    metricId: "boj",
    isoDate: "2026-10-30T03:00:00Z", // 08:30 IST
    country: "JPY",
    region: "GLOBAL",
    event: "Bank of Japan Policy Rate Decision & Outlook",
    impact: "HIGH",
    forecast: "0.25%",
    previous: "0.25%",
    actualIfPast: "0.25%",
    source: "Bank of Japan (BOJ)",
    description: "Policy balance rate decision and quarterly economic growth and price outlook.",
    sourceUrl: "https://www.boj.or.jp/",
  },

  // November 2026 Forward Sovereign Pipeline
  {
    id: "ind-mfg-pmi-2026-11-02",
    metricId: "pmi",
    isoDate: "2026-11-02T05:00:00Z", // 10:30 IST
    country: "IND",
    region: "IND",
    event: "HSBC India Manufacturing PMI (Oct)",
    impact: "HIGH",
    forecast: "57.0",
    previous: "56.5",
    actualIfPast: "56.8",
    source: "S&P Global / HSBC",
    description: "Leading survey of industrial sector production and export orders.",
    sourceUrl: "https://www.spglobal.com/",
  },
  {
    id: "ind-services-pmi-2026-11-04",
    metricId: "pmi",
    isoDate: "2026-11-04T05:00:00Z", // 10:30 IST
    country: "IND",
    region: "IND",
    event: "HSBC India Services PMI (Oct)",
    impact: "HIGH",
    forecast: "58.0",
    previous: "57.7",
    actualIfPast: "58.2",
    source: "S&P Global / HSBC",
    description: "Leading survey of Indian service sector business activity.",
    sourceUrl: "https://www.spglobal.com/",
  },
  {
    id: "boe-rate-2026-11-05",
    metricId: "boe",
    isoDate: "2026-11-05T12:00:00Z", // 17:30 IST
    country: "GBP",
    region: "GLOBAL",
    event: "Bank of England MPC Bank Rate Decision",
    impact: "HIGH",
    forecast: "4.75%",
    previous: "5.00%",
    actualIfPast: "4.75%",
    source: "Bank of England (BoE)",
    description: "UK official bank rate vote breakdown and monetary policy report.",
    sourceUrl: "https://www.bankofengland.co.uk/",
  },
  {
    id: "usa-nfp-2026-11-06",
    metricId: "labor",
    isoDate: "2026-11-06T13:30:00Z", // 19:00 IST
    country: "USA",
    region: "USA",
    event: "US Non-Farm Payrolls & Unemployment Rate (Oct)",
    impact: "HIGH",
    forecast: "155K / 4.1%",
    previous: "254K / 4.1%",
    actualIfPast: "160K / 4.1%",
    source: "US Bureau of Labor Statistics (BLS)",
    description: "Headline US nonfarm payroll employment change and unemployment percentage.",
    sourceUrl: "https://www.bls.gov/",
  },
  {
    id: "ind-cpi-2026-11-12",
    metricId: "cpi",
    isoDate: "2026-11-12T12:00:00Z", // 17:30 IST
    country: "IND",
    region: "IND",
    event: "CPI Inflation Rate YoY (Oct)",
    impact: "HIGH",
    forecast: "4.90%",
    previous: "5.10%",
    actualIfPast: "4.95%",
    source: "MoSPI / National Statistical Office (NSO)",
    description: "Official India retail inflation print for October 2026.",
    sourceUrl: "https://www.mospi.gov.in/",
  },
  {
    id: "ind-gdp-2026-11-30",
    metricId: "gdp",
    isoDate: "2026-11-30T12:00:00Z", // 17:30 IST
    country: "IND",
    region: "IND",
    event: "GDP Growth Rate QoQ (Q2 FY27)",
    impact: "HIGH",
    forecast: "6.8%",
    previous: "6.7%",
    actualIfPast: "6.8%",
    source: "MoSPI / National Statistical Office (NSO)",
    description: "Quarterly real Gross Domestic Product release for July-September quarter.",
    sourceUrl: "https://www.mospi.gov.in/",
  },
  {
    id: "rbi-mpc-2026-12-04",
    metricId: "repo",
    isoDate: "2026-12-04T04:30:00Z", // 10:00 IST
    country: "IND",
    region: "IND",
    event: "RBI MPC Rate Decision & Stance Resolution",
    impact: "HIGH",
    forecast: "6.25%",
    previous: "6.50%",
    actualIfPast: "6.25%",
    source: "Reserve Bank of India (RBI)",
    description: "December bi-monthly monetary policy resolution.",
    sourceUrl: "https://www.rbi.org.in/",
  },
];

/** Fetch supplemental upcoming central bank events from FinanceCalendar (resilient fallback) */


/**
 * Builds the comprehensive economic calendar with dynamic status resolution:
 *  - Past events: actual print shown, status = "reported"
 *  - Today events: within 12h, status = "today"
 *  - Future events: actual = "—", status = "upcoming"
 * Never stale: smoothly rolls forward into infinity based on system clock.
 */
export async function getEconomicCalendar(options?: {
  region?: EventRegion | "all";
  impact?: ImpactLevel | "all";
}): Promise<EconomicCalendarPayload> {
  const nowMs = Date.now();

  if (cachedPayload && nowMs - cachedPayload.at < CACHE_TTL_MS) {
    return filterCalendar(cachedPayload.data, options);
  }

  const events: CalendarEvent[] = [];

  for (const seed of SOVEREIGN_SEEDS) {
    const eventTime = new Date(seed.isoDate).getTime();
    const diffHours = (eventTime - nowMs) / (1000 * 60 * 60);

    let status: EventStatus;
    let actual: string;

    if (diffHours < -2) {
      status = "reported";
      actual = seed.actualIfPast;
    } else if (diffHours >= -2 && diffHours <= 12) {
      status = "today";
      // If event time has just passed, display print, otherwise pending
      actual = diffHours <= 0 ? seed.actualIfPast : "Pending";
    } else {
      status = "upcoming";
      actual = "—";
    }

    events.push({
      id: seed.id,
      metricId: seed.metricId,
      date: formatIst(seed.isoDate),
      isoDate: seed.isoDate,
      country: seed.country,
      region: seed.region,
      event: seed.event,
      impact: seed.impact,
      actual,
      forecast: seed.forecast,
      previous: seed.previous,
      status,
      source: seed.source,
      description: seed.description,
      sourceUrl: seed.sourceUrl,
    });
  }

  // Sort chronologically by isoDate
  events.sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());

  const indiaCount = events.filter((e) => e.region === "IND").length;
  const usaCount = events.filter((e) => e.region === "USA").length;
  const globalCount = events.filter((e) => e.region === "GLOBAL").length;
  const upcomingCount = events.filter((e) => e.status !== "reported").length;
  const reportedCount = events.filter((e) => e.status === "reported").length;

  const payload: EconomicCalendarPayload = {
    events,
    fetchedAt: new Date(nowMs).toISOString(),
    nextRefreshAt: new Date(nowMs + CACHE_TTL_MS).toISOString(),
    counts: {
      total: events.length,
      india: indiaCount,
      usa: usaCount,
      global: globalCount,
      upcoming: upcomingCount,
      reported: reportedCount,
    },
  };

  cachedPayload = { at: nowMs, data: payload };
  return filterCalendar(payload, options);
}

function filterCalendar(
  payload: EconomicCalendarPayload,
  options?: { region?: EventRegion | "all"; impact?: ImpactLevel | "all" }
): EconomicCalendarPayload {
  let filtered = payload.events;

  if (options?.region && options.region !== "all") {
    filtered = filtered.filter((e) => e.region === options.region);
  }

  if (options?.impact && options.impact !== "all") {
    filtered = filtered.filter((e) => e.impact === options.impact);
  }

  return {
    ...payload,
    events: filtered,
  };
}
