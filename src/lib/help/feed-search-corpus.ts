/** Static provider blurbs for /data/feeds semantic search — mirrors the feed source IDs
 * used across src/lib/feeds/hub.ts and the source health grid. */
export type FeedSearchDoc = { id: string; title: string; blurb: string; href: string };

export const FEED_SEARCH_DOCS: FeedSearchDoc[] = [
  { id: "nse", title: "NSE India", blurb: "National Stock Exchange corporate announcements, circulars, and index data.", href: "https://www.nseindia.com/" },
  { id: "bse", title: "BSE India", blurb: "Bombay Stock Exchange corporate filings and governance disclosure notices.", href: "https://www.bseindia.com/" },
  { id: "rbi", title: "Reserve Bank of India", blurb: "Monetary policy, system liquidity, banking penalties, and press releases.", href: "https://www.rbi.org.in/" },
  { id: "upstox", title: "Upstox", blurb: "Exchange-licensed live quotes, option chains, and IPO calendar for Indian markets.", href: "https://upstox.com/" },
  { id: "fred", title: "FRED (St. Louis Fed)", blurb: "US Treasury yields and macroeconomic time series.", href: "https://fred.stlouisfed.org/" },
  { id: "worldbank", title: "World Bank", blurb: "Global development and macroeconomic indicators, including India GDP growth.", href: "https://data.worldbank.org/" },
  { id: "imf", title: "IMF", blurb: "International Monetary Fund macro and financial stability indicators.", href: "https://www.imf.org/" },
  { id: "oecd", title: "OECD", blurb: "Cross-country economic indicators and leading indices.", href: "https://www.oecd.org/" },
  { id: "mospi", title: "MOSPI", blurb: "India's Ministry of Statistics — CPI, IIP, GDP, and other official national statistics.", href: "https://www.mospi.gov.in/" },
  { id: "yahoo", title: "Yahoo Finance", blurb: "Fallback global equity, index, currency, and commodity quotes.", href: "https://finance.yahoo.com/" },
  { id: "reddit", title: "Reddit", blurb: "Real-time community discussion search across tracked India investing subreddits.", href: "https://www.reddit.com/" },
];
