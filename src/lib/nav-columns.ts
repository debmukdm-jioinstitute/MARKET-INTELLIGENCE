export type NavLink = {
  label: string;
  href: string;
  desc: string;
  badge?: "AI" | "NEW";
  external?: boolean;
};
/** A group is one task ("Scanners & Signals"): shown as a single card in menus, its pages become tabs on the page itself. */
export type NavGroup = { label: string; desc: string; badge?: "AI" | "NEW"; items: NavLink[] };
export type NavSection = { title: string; tagline: string; groups: NavGroup[] };
/** Legacy flat shape (marketing menu, guided tour): one item per group. */
export type NavColumn = { title: string; items: NavLink[] };

/** Organised by what the visitor wants to do, not by data type — 6 sections, each with 1–6 tasks. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Today",
    tagline: "What is happening in markets right now",
    groups: [
      {
        label: "Market Snapshot",
        desc: "Indices, rupee and commodities at a glance.",
        items: [
          { label: "Overview", href: "/markets", desc: "Equities, rates and FX on one board." },
          { label: "India Markets", href: "/markets/india", desc: "NSE / BSE headline pulse and index depth." },
          { label: "World Indices", href: "/macro/indices", desc: "Global benchmarks, ranges and 52-week tape." },
          { label: "Currency", href: "/macro/currency", desc: "DXY, USDINR and cross-currency tape." },
          { label: "Commodities", href: "/macro/commodities", desc: "Crude, gold and industrial metals." },
        ],
      },
      {
        label: "Daily Briefing",
        desc: "Start here: the day in two minutes.",
        badge: "AI",
        items: [
          { label: "Daily Brief", href: "/intelligence/brief", desc: "Pre-market and post-close brief with cited sources.", badge: "AI" },
          { label: "Intelligence Feed", href: "/intelligence", desc: "News scored for sentiment and relevance.", badge: "AI" },
          { label: "World Monitor", href: "/intelligence/world-monitor", desc: "Global news, country risk and finance radar." },
          { label: "Economic Calendar", href: "/macro/calendar", desc: "Upcoming data releases that can move markets.", badge: "NEW" },
        ],
      },
    ],
  },
  {
    title: "Stocks",
    tagline: "Research any company",
    groups: [
      {
        label: "AI Debate",
        desc: "Five AI analysts argue the bull and bear case.",
        badge: "AI",
        items: [
          { label: "AI Desk", href: "/research/ai-desk", desc: "Five AI analysts debate a stock, with sources and factor backtests.", badge: "AI" },
        ],
      },
      {
        label: "Research",
        desc: "What brokers and our models say.",
        items: [
          { label: "Broker Consensus", href: "/research", desc: "Broker targets, consensus and what changed." },
          { label: "MI Research Notes", href: "/research-reports", desc: "Model-driven notes across the coverage list." },
        ],
      },
      {
        label: "Company Deep-Dive",
        desc: "Disclosures, concalls and timelines.",
        items: [
          { label: "Company Page", href: "/intelligence/company", desc: "IR disclosures, timeline and AI what-changed summaries.", badge: "NEW" },
        ],
      },
      {
        label: "Buzz & Sentiment",
        desc: "What retail and search data say.",
        items: [
          { label: "Retail Sentiment", href: "/intelligence/reddit", desc: "Reddit chatter, mention spikes and bull/bear theses." },
          { label: "Search Trends", href: "/intelligence/search-trends", desc: "Google search interest in companies, IPOs and sectors." },
        ],
      },
      {
        label: "Ownership & Risk",
        desc: "Who owns it and what could go wrong.",
        items: [
          { label: "Promoter Tracker", href: "/intelligence/promoters", desc: "Promoter buying, selling, pledges and insider trades." },
          { label: "Credit Radar", href: "/intelligence/credit", desc: "Rating upgrades, downgrades and default watch." },
          { label: "Legal Risk", href: "/intelligence/legal-risk", desc: "NCLT, SEBI and court cases involving listed companies." },
        ],
      },
      {
        label: "IPOs & Offers",
        desc: "New listings and capital raisings.",
        items: [
          { label: "IPO Pipeline", href: "/research/ipo", desc: "Upcoming IPOs, GMP and subscription tracking." },
          { label: "Bonds, Rights & Buybacks", href: "/research/offers", desc: "Debenture, rights issue, buyback and offer-for-sale calendars." },
        ],
      },
    ],
  },
  {
    title: "Trade",
    tagline: "Find short-term ideas",
    groups: [
      {
        label: "Signature Tools",
        desc: "The fastest way to find and test ideas.",
        items: [
          { label: "Stock Scanner", href: "/intelligence/scanner", desc: "Live Nifty 500 scans: breakouts, volume, RSI, MACD.", badge: "NEW" },
          { label: "Trade Lab", href: "/intelligence/trade-lab", desc: "RSI, MACD and 13 more indicators, chart patterns and backtests for any index or F&O stock.", badge: "NEW" },
          { label: "Alerts", href: "/intelligence/alerts", desc: "Breakout and scan alerts on your schedule." },
          { label: "Options Flow", href: "/research/options-flow", desc: "Unusual activity across the options tape.", badge: "AI" },
        ],
      },
      {
        label: "Signals & Tests",
        desc: "Model signals, backtests and derivatives.",
        items: [
          { label: "AI Signals", href: "/intelligence/ai-signals", desc: "Next-day model with its published track record.", badge: "AI" },
          { label: "Backtesting", href: "/intelligence/backtesting", desc: "Test scanner ideas against history." },
          { label: "Derivatives", href: "/markets/derivatives", desc: "F&O open interest and positioning." },
          { label: "Breadth & Momentum", href: "/markets/breadth", desc: "Advance/decline and trend leaders in one view." },
        ],
      },
    ],
  },
  {
    title: "Macro & Flows",
    tagline: "The economy and big money",
    groups: [
      {
        label: "Macro Board",
        desc: "Growth, inflation, rates and liquidity.",
        items: [
          { label: "Global Board", href: "/macro", desc: "Regime-first read on growth, inflation, liquidity." },
          { label: "India Macro", href: "/macro/india", desc: "MOSPI, RBI and fiscal data on one page." },
          { label: "RBI & Liquidity", href: "/macro/rbi", desc: "Policy stance, repo path and system liquidity." },
          { label: "Global Data", href: "/macro/global", desc: "Cross-country macro series." },
          { label: "Yields", href: "/macro/yields", desc: "Bond yields across tenors and countries.", badge: "NEW" },
        ],
      },
      {
        label: "Stress & Scenarios",
        desc: "What breaks, and what if it does.",
        items: [
          { label: "Stress Index", href: "/macro/stress", desc: "India macro stress score and warning clusters." },
          { label: "Scenarios", href: "/macro/scenarios", desc: "Shock oil, INR or yields; see the impact." },
          { label: "How Shocks Spread", href: "/macro/transmission", desc: "Which sectors move when oil, INR or US yields jump." },
        ],
      },
      {
        label: "Big Flows",
        desc: "Follow institutional money.",
        items: [
          { label: "Institutional Flows", href: "/intelligence/institutional", desc: "FII/DII cash, MF smart-money and ownership signals." },
        ],
      },
      {
        label: "Sectors & Valuation",
        desc: "Cheap or expensive? Who leads?",
        items: [
          { label: "Sector Map", href: "/markets/sectors", desc: "Sector performance and comparables." },
          { label: "Valuation", href: "/markets/sectors?tab=valuation", desc: "Index multiples and the 10-year G-Sec." },
        ],
      },
    ],
  },
  {
    title: "Portfolio",
    tagline: "Track and improve your holdings",
    groups: [
      {
        label: "Holdings",
        desc: "What you own and what it's worth.",
        items: [
          { label: "Overview", href: "/portfolio", desc: "Live positions, NAV and P&L." },
          { label: "Watchlist", href: "/portfolio/watchlist", desc: "Names you're tracking without a position." },
          { label: "Allocation", href: "/portfolio/allocation", desc: "Your actual exposure vs your targets." },
          { label: "Activity", href: "/portfolio/activity", desc: "Every trade and corporate action in one log.", badge: "NEW" },
        ],
      },
      {
        label: "Risk & Improve",
        desc: "How bumpy the ride is, and how to smooth it.",
        items: [
          { label: "Risk", href: "/portfolio/risk", desc: "Volatility, drawdowns and worst-case estimates." },
          { label: "Attribution", href: "/portfolio/attribution", desc: "What drove your returns: sectors or stock picks." },
          { label: "Factor Exposure", href: "/portfolio/quant", desc: "Value, momentum and size tilts in your portfolio." },
          { label: "Optimizer", href: "/portfolio/optimizer", desc: "Rebalance suggestions for your risk level." },
          { label: "Tax", href: "/portfolio/tax", desc: "Capital-gains view of your holdings.", badge: "NEW" },
        ],
      },
    ],
  },
  {
    title: "Data & Tools",
    tagline: "Sources, downloads and extras",
    groups: [
      {
        label: "Data Centre",
        desc: "Where the numbers come from.",
        items: [
          { label: "Sources & Status", href: "/data", desc: "Feed health and data freshness." },
          { label: "Data Health", href: "/data/health", desc: "Freshness and provenance of every series." },
          { label: "Data Feeds", href: "/data/feeds", desc: "Every connected market-data provider." },
          { label: "World Bank Data", href: "/data/data360", desc: "World Bank macro series for India and the US." },
          { label: "Data Export", href: "/data/export", desc: "Download site datasets as Excel." },
        ],
      },
    ],
  },
];

/** Default route when tapping a bottom-tab section on mobile (matches START_HERE intent). */
export const SECTION_LANDING_HREF: Record<string, string> = {
  Today: "/Home",
  Stocks: "/research",
  Trade: "/intelligence/scanner",
  "Macro & Flows": "/macro",
  Portfolio: "/portfolio",
  "Data & Tools": "/data",
};

/** First allowed in-app page for a nav section (mobile bottom bar direct navigation). */
export function sectionLandingHref(
  section: NavSection,
  hrefAllowed: (href: string) => boolean = () => true,
): string {
  const preferred = SECTION_LANDING_HREF[section.title];
  if (preferred && hrefAllowed(preferred)) return preferred;
  for (const group of section.groups) {
    for (const item of group.items) {
      if (!item.external && hrefAllowed(item.href)) return item.href;
    }
  }
  return hrefAllowed("/Home") ? "/Home" : "/markets/india";
}

/** Beginner shortcuts shown at the top of the full menu. */
export const START_HERE = [
  { label: "Just want today's view?", cta: "Read the 2-minute Daily Brief", href: "/intelligence/brief" },
  { label: "Researching a stock?", cta: "Ask the AI Desk", href: "/research/ai-desk" },
  { label: "Looking for trading ideas?", cta: "Run the Stock Scanner", href: "/intelligence/scanner" },
  { label: "Want to test an idea on real data?", cta: "Try Trade Lab", href: "/intelligence/trade-lab" },
  { label: "Already own stocks?", cta: "Open My Portfolio", href: "/portfolio" },
] as const;

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type SitemapSection = { title: string; links: { label: string; href: string }[] };

/** Footer sitemap — derived from NAV_SECTIONS so new pages stay in sync. */
export function buildSitemapSections(): SitemapSection[] {
  return NAV_SECTIONS.map((section) => ({
    title: section.title,
    links: section.groups.flatMap((group) =>
      group.items.filter((item) => !item.external).map((item) => ({ label: item.label, href: item.href })),
    ),
  })).filter((section) => section.links.length > 0);
}

/** Legacy flat view: each group becomes one item. Kept for the marketing menu and guided tour. */
export const NAV_COLUMNS: NavColumn[] = NAV_SECTIONS.map((s) => ({
  title: s.title,
  items: s.groups.map((g) => ({ label: g.label, href: g.items[0]!.href, desc: g.desc, badge: g.badge, external: g.items[0]!.external })),
}));

/** Longest-prefix match of a pathname to the group it belongs to (for in-page tabs and active states). */
export function findGroup(sections: NavSection[], path: string): { section: NavSection; group: NavGroup; href: string } | null {
  let best: { section: NavSection; group: NavGroup; href: string } | null = null;
  for (const section of sections) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.external) continue;
        if (path === item.href || path.startsWith(item.href + "/")) {
          if (!best || item.href.length > best.href.length) best = { section, group, href: item.href };
        }
      }
    }
  }
  return best;
}
