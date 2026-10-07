/**
 * Where each research-page panel gets its data. The Panel shell looks a title up here when the panel
 * does not declare its own `trust`, so every listed panel shows the source "eye" without touching it.
 * Add a row when you add a panel. `url` should open the primary source so a user can verify the number.
 */
export type PanelSource = { source: string; url?: string; method: string; note?: string };

export const PANEL_SOURCES: Record<string, PanelSource> = {
  "Risk & events": { source: "Upstox / Yahoo daily prices, NSE and SEC filings", url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements", method: "Volatility, drawdown and beta are computed in-house from the last year of daily closes; event dates come from exchange and SEC filings." },
  "Quote & depth": { source: "Upstox market data (NSE official feed)", url: "https://www.nseindia.com/get-quotes/equity", method: "Last price, change and the 5-level order book are read from the Upstox market-data feed for NSE." },
  Session: { source: "Upstox market data (NSE official feed)", url: "https://www.nseindia.com/", method: "Open, high, low, volume and the 52-week range from today's trading session." },
  "Price history (1Y · Upstox daily)": { source: "Upstox daily candles", url: "https://upstox.com/", method: "Daily open-high-low-close-volume candles for the last year, adjusted as delivered by Upstox." },
  "Fundamentals (Upstox key ratios)": { source: "Upstox key ratios", url: "https://upstox.com/", method: "Ratios are reported by Upstox from company financial statements; we do not recompute them." },
  Price: { source: "Yahoo Finance / Massive (US market data)", url: "https://finance.yahoo.com/", method: "US quotes are read from Yahoo Finance, with Massive as a fallback." },
  Snapshot: { source: "Yahoo Finance / Massive (US market data)", url: "https://finance.yahoo.com/", method: "Key statistics for US-listed names from Yahoo Finance and Massive." },
  "SEC filings": { source: "SEC EDGAR", url: "https://www.sec.gov/edgar/search/", method: "Filings list straight from the SEC's public EDGAR index." },
  "News and what it may mean": { source: "Publisher RSS feeds and Google News", url: "https://news.google.com/", method: "Headlines are collected from publisher feeds; the 'what it may mean' reading is a rule-based, in-house classification of the headline text." },
  "Dividends, splits and filings": { source: "NSE corporate actions and filings", url: "https://www.nseindia.com/companies-listing/corporate-filings-actions", method: "Corporate actions and announcements as filed with the exchange." },
  "Where to read broker research": { source: "Broker research portals", method: "Links to publicly available broker research pages; we do not republish the reports." },
  "Technical Trend & Momentum": { source: "Computed in-house from daily prices", method: "Moving averages, RSI and momentum are calculated from the stock's daily closing prices with standard formulas.", note: "Computed values, not advice" },
  "Options Positioning (F&O)": { source: "NSE option chain", url: "https://www.nseindia.com/option-chain", method: "Open interest, put-call ratio and strikes are read from the NSE option chain and summarised." },
  "IPO & Listing History": { source: "NSE and IPO registries", url: "https://www.nseindia.com/market-data/all-upcoming-issues-ipo", method: "Listing facts from exchange and SEBI-registered IPO records." },
  "Market Radar & Scanner Signals": { source: "In-house scanner over NSE data", method: "Rule-based scans (momentum, volume, breadth) run on NSE end-of-day and live data.", note: "Signals are descriptive, not advice" },
  "Leadership, pay and ownership": { source: "NSE shareholding filings (XBRL), company annual reports, Wikidata", url: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern", method: "Share counts come from the latest NSE shareholding pattern filing; pay tables are read from the company's BRSR; founders and CEOs from Wikidata." },
  "What moves this stock": { source: "Regulator sites, Google News and in-house business rules", url: "https://news.google.com/", method: "Drivers come from a curated map of what moves each business line; headlines are matched to each driver from Google News RSS and ranked by recency and relevance." },
  "Who owns it": { source: "NSE shareholding pattern filings (XBRL)", url: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern", method: "Promoter, institution and pledge figures are read from the XBRL file the company files with NSE every quarter." },
  "Said vs guided": { source: "Company earnings-call transcripts", method: "Highlights are copied word for word from the transcript; tone is scored in-house from a finance word list." },
};

export function panelSource(title: unknown): PanelSource | null {
  if (typeof title !== "string") return null;
  return PANEL_SOURCES[title] ?? null;
}

/** Best-effort official URL for a provider name, so a trust line can always be verified. */
export function urlForSource(name: string): string | undefined {
  const s = name.toLowerCase();
  if (/nse/.test(s)) return "https://www.nseindia.com/";
  if (/bse/.test(s)) return "https://www.bseindia.com/";
  if (/upstox/.test(s)) return "https://upstox.com/";
  if (/yahoo/.test(s)) return "https://finance.yahoo.com/";
  if (/sec\b|edgar/.test(s)) return "https://www.sec.gov/edgar/search/";
  if (/rbi/.test(s)) return "https://www.rbi.org.in/";
  if (/sebi/.test(s)) return "https://www.sebi.gov.in/";
  if (/screener/.test(s)) return "https://www.screener.in/";
  if (/google news/.test(s)) return "https://news.google.com/";
  return undefined;
}
