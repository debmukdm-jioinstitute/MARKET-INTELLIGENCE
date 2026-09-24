import { randomBytes } from "node:crypto";
import { calendarSheets, databaseSheets, referenceSheets, scannerSheets } from "./collect-data";
import { dashboardSheets, feedHubSheets, macroHubSheets, stressSheets, tapeSheets, transmissionSheets } from "./collect-market";
import { buildWorkbook, type BuilderLog, type SheetSpec } from "./workbook";

const PER_BUILDER_MS = 40_000;

const SOURCES: { provider: string; supplies: string; url: string; note: string }[] = [
  { provider: "NSE India", supplies: "Index levels, breadth, F&O, FII/DII flows, Nifty 500 constituents", url: "https://www.nseindia.com", note: "Exchange data — redistribution restricted by NSE" },
  { provider: "BSE India", supplies: "Sensex, corporate announcements", url: "https://www.bseindia.com", note: "Exchange data — redistribution restricted by BSE" },
  { provider: "Reserve Bank of India", supplies: "Policy rates, liquidity, forex reserves, yield data", url: "https://www.rbi.org.in", note: "Public statistics; cite RBI" },
  { provider: "CCIL", supplies: "Government securities yields", url: "https://www.ccilindia.com", note: "Subject to CCIL terms" },
  { provider: "Upstox", supplies: "Quotes, option chains, IPO data, instrument master", url: "https://upstox.com/developer/api-documentation/", note: "Vendor data — licensed; not for redistribution" },
  { provider: "Yahoo Finance", supplies: "Daily prices, index history, earnings dates", url: "https://finance.yahoo.com", note: "Personal use only under Yahoo's terms" },
  { provider: "Stooq", supplies: "Global index and FX quotes", url: "https://stooq.com", note: "Subject to Stooq terms" },
  { provider: "Alpha Vantage", supplies: "Backup quotes", url: "https://www.alphavantage.co", note: "Subject to vendor terms" },
  { provider: "Massive", supplies: "US market data", url: "https://massive.com", note: "Vendor data — licensed" },
  { provider: "FRED (St. Louis Fed)", supplies: "US yields, dollar index, macro series", url: "https://fred.stlouisfed.org", note: "Public series; some third-party series carry their own terms" },
  { provider: "IMF", supplies: "Global macro indicators", url: "https://www.imf.org/en/Data", note: "Subject to IMF terms" },
  { provider: "World Bank", supplies: "Macro indicators", url: "https://data.worldbank.org", note: "CC BY 4.0" },
  { provider: "OECD", supplies: "Macro indicators", url: "https://data.oecd.org", note: "Subject to OECD terms" },
  { provider: "MoSPI", supplies: "CPI, WPI, IIP, GDP", url: "https://mospi.gov.in", note: "Government of India statistics" },
  { provider: "data.gov.in", supplies: "Open government datasets", url: "https://data.gov.in", note: "Government Open Data License – India" },
  { provider: "Cboe", supplies: "VIX history", url: "https://www.cboe.com/tradable_products/vix/", note: "Subject to Cboe terms" },
  { provider: "CFTC", supplies: "Commitments of Traders positioning", url: "https://www.cftc.gov", note: "Public data" },
  { provider: "US Bureau of Labor Statistics", supplies: "US labour and inflation data", url: "https://www.bls.gov", note: "Public data" },
  { provider: "European Central Bank", supplies: "Euro-area rates and FX reference", url: "https://data.ecb.europa.eu", note: "Subject to ECB terms" },
  { provider: "AMFI", supplies: "Mutual fund NAV and industry data", url: "https://www.amfiindia.com", note: "Public data" },
  { provider: "Prof. Aswath Damodaran (NYU Stern)", supplies: "Equity risk premium and valuation datasets", url: "https://pages.stern.nyu.edu/~adamodar/", note: "Cite the author" },
  { provider: "SEC EDGAR", supplies: "US filings", url: "https://www.sec.gov/edgar", note: "Public filings" },
  { provider: "Economic Times / LiveMint", supplies: "Broker recommendation headlines (linked, not reproduced)", url: "https://economictimes.indiatimes.com", note: "Headlines and links only; articles belong to the publishers" },
  { provider: "PKScreener (open source)", supplies: "Scanner definitions the scan engine follows", url: "https://github.com/pkjmesra/PKScreener", note: "Open-source project; scans here are independently implemented" },
  { provider: "Market Intelligence", supplies: "Scanner results, backtests, AI signals, stress index, regime, briefs, change log", url: "https://getmarketintelligence.in", note: "Proprietary analytics — licensed, not for reproduction" },
];

const NOT_EXPORTED: BuilderLog[] = [
  { builder: "Sectors page", status: "skipped", sheets: [], ms: 0, message: "The Sectors page currently shows illustrative sample values, not live data, so it is not exported as market data." },
  { builder: "Economic Calendar page", status: "skipped", sheets: [], ms: 0, message: "The Economic Calendar page currently shows illustrative sample events, not a live feed, so it is not exported." },
  { builder: "Portfolio pages", status: "skipped", sheets: [], ms: 0, message: "Portfolio, risk, attribution and optimiser pages show each user's private holdings and are never included in an export." },
  { builder: "CMIE Prowess company reports", status: "skipped", sheets: [], ms: 0, message: "Licensed third-party company financials (CMIE Prowess) are excluded until redistribution rights are confirmed." },
];

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${Math.round(ms / 1000)}s`)), ms))]);

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  exportId: string;
  logs: BuilderLog[];
  sheets: number;
}

/** Collects every dataset the site shows (each builder isolated so one failing upstream never blocks the rest) and builds the branded workbook. */
export async function buildExport(opts: { generatedFor: string; logo?: Buffer | null }): Promise<ExportResult> {
  const generatedAt = new Date();
  const exportId = `MI-${generatedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;

  const builders: [string, () => Promise<SheetSpec[]> | SheetSpec[]][] = [
    ["Home dashboard (pulse, indices, breadth, flows, RBI, macro, stress)", dashboardSheets],
    ["Macro hub and regime", macroHubSheets],
    ["Live feeds, news and feed health", feedHubSheets],
    ["Macro tape (yield curves, commodities, FX, transmission)", tapeSheets],
    ["Stress history, alerts and backtest", stressSheets],
    ["Sector betas and scenarios", transmissionSheets],
    ["Scanners, backtests and AI signals", scannerSheets],
    ["Earnings and IPO calendar", calendarSheets],
    ["Database-backed datasets (options flow, research, open data, collectors, briefs, change log)", databaseSheets],
    ["Metric definitions", referenceSheets],
  ];

  const results = await Promise.all(
    builders.map(async ([name, fn]) => {
      const t0 = Date.now();
      try {
        const sheets = await withTimeout(Promise.resolve(fn()), PER_BUILDER_MS);
        return { specs: sheets, log: { builder: name, status: "ok", sheets: sheets.map((s) => s.name), ms: Date.now() - t0 } as BuilderLog };
      } catch (e) {
        return { specs: [] as SheetSpec[], log: { builder: name, status: "failed", sheets: [], ms: Date.now() - t0, message: e instanceof Error ? e.message : String(e) } as BuilderLog };
      }
    }),
  );

  // unique sheet names
  const seen = new Set<string>(["Cover", "Contents", "Sources & Licences", "Export Log"]);
  const specs = results.flatMap((r) => r.specs).filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
  const logs = [...results.map((r) => r.log), ...NOT_EXPORTED];

  const sourcesSheet: SheetSpec = {
    name: "Sources & Licences",
    title: "Sources & Licences",
    description: "Every provider behind the data, what it supplies, where to find the original, and its licensing position. Data remains the property of its owners.",
    cols: [
      { header: "Provider", key: "provider", width: 34 },
      { header: "What it supplies", key: "supplies", width: 64 },
      { header: "Original source", key: "url", fmt: "link", width: 52 },
      { header: "Licence / usage note", key: "note", width: 56 },
    ],
    rows: SOURCES,
    notes: ["This workbook is provided strictly for personal use. Commercial use, reproduction or redistribution requires prior written authorisation — contact Deb@getmarketintelligence.in."],
  };

  const buffer = await buildWorkbook(specs, sourcesSheet, { generatedAt, exportId, generatedFor: opts.generatedFor, logo: opts.logo, logs });
  return { buffer, filename: `MarketIntelligence_Data_${generatedAt.toISOString().slice(0, 10)}.xlsx`, exportId, logs, sheets: specs.length + 4 };
}
