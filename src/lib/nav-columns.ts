import { hubHref } from "@/lib/hubs";

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

const L = (label: string, href: string, desc: string, badge?: "AI" | "NEW"): NavLink => ({ label, href, desc, ...(badge ? { badge } : {}) });

/** Seven primary hubs (sitemap consolidation). Each hub is one long scroll page; links jump to `?section=<id>`. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Today",
    tagline: "What is happening in markets right now",
    groups: [
      {
        label: "Daily Briefing",
        desc: "Start here: the day in two minutes.",
        badge: "AI",
        items: [
          L("Daily Brief", hubHref("today", "brief"), "Pre-market and post-close brief with cited sources.", "AI"),
          L("Economic Calendar", hubHref("today", "calendar"), "Upcoming data releases, holidays and corporate actions."),
          L("Intelligence Feed", hubHref("today", "feed"), "News scored for sentiment and relevance.", "AI"),
          L("World Monitor", hubHref("today", "world-monitor"), "Global news, country risk and finance radar."),
        ],
      },
    ],
  },
  {
    title: "Markets",
    tagline: "India and world tape, breadth, valuation and mood",
    groups: [
      {
        label: "Market Snapshot",
        desc: "Indices, rupee and commodities at a glance.",
        items: [
          L("India Markets", hubHref("markets", "india"), "NSE / BSE headline pulse and index depth."),
          L("World Indices", hubHref("markets", "world"), "Global benchmarks, ranges and 52-week tape."),
          L("Currency", hubHref("markets", "currency"), "DXY, USDINR and cross-currency tape."),
          L("Commodities", hubHref("markets", "commodities"), "Crude, gold and industrial metals."),
        ],
      },
      {
        label: "Breadth & Valuation",
        desc: "How broad is the move, and is it expensive?",
        items: [
          L("Breadth & Momentum", hubHref("markets", "breadth"), "Advance/decline and trend leaders in one view."),
          L("Sector Map", hubHref("markets", "sectors"), "Sector performance and comparables."),
          L("Valuation", hubHref("markets", "valuation"), "Index P/E and P/B against their usual range."),
          L("Market Activity", hubHref("markets", "activity"), "Cash turnover and index-futures positioning."),
        ],
      },
      {
        label: "Mood & Stress",
        desc: "Fear, greed and market stress.",
        items: [
          L("Fear & Greed", hubHref("markets", "fear-greed"), "Multi-factor sentiment across breadth, momentum, VIX, PCR and flows.", "NEW"),
          L("Market Stress", hubHref("markets", "market-stress"), "Equity and tape stress signals."),
        ],
      },
    ],
  },
  {
    title: "Economy",
    tagline: "Macro, RBI, yields and the global picture",
    groups: [
      {
        label: "Macro Board",
        desc: "Growth, inflation, rates and liquidity.",
        items: [
          L("Global Board", hubHref("economy", "global-board"), "Regime-first read on growth, inflation, liquidity."),
          L("India Macro", hubHref("economy", "india-macro"), "MOSPI, RBI and fiscal data on one page."),
          L("RBI & Liquidity", hubHref("economy", "rbi"), "Policy stance, repo path and system liquidity."),
          L("Yields", hubHref("economy", "yields"), "Bond yields across tenors and countries.", "NEW"),
          L("Global Data", hubHref("economy", "global-data"), "Cross-country macro series and World Bank data."),
        ],
      },
      {
        label: "Stress & Scenarios",
        desc: "What breaks, and what if it does.",
        items: [
          L("Stress Index", hubHref("economy", "macro-stress"), "India macro stress score and warning clusters."),
          L("Scenarios", hubHref("economy", "scenarios"), "Shock oil, INR or yields; see the impact."),
          L("Shock transmission", hubHref("economy", "transmission"), "Which sectors move when oil, INR or US yields jump."),
          L("Economic Calendar", hubHref("economy", "calendar"), "Data releases, holidays and corporate actions."),
        ],
      },
    ],
  },
  {
    title: "Funds & Flows",
    tagline: "Where the big money is going",
    groups: [
      {
        label: "Big Flows",
        desc: "Follow institutional money.",
        items: [
          L("Institutional Flows", hubHref("funds", "institutional"), "FII/DII cash, MF smart-money and ownership signals."),
          L("Margin Trading (MTF)", hubHref("funds", "mtf"), "System-wide funded margin book and daily exposure."),
        ],
      },
      {
        label: "Mutual Funds",
        desc: "SIP inflows, AUM scale and categories.",
        items: [
          L("Funds Intelligence", hubHref("funds", "funds-overview"), "SIP trends and industry AUM."),
          L("Fund Categories", hubHref("funds", "categories"), "Equity, debt, hybrid and passive flows."),
          L("NFO & Distribution", hubHref("funds", "nfo-distribution"), "New fund offerings mobilized."),
          L("SIP Ownership", hubHref("funds", "sip"), "Contributing accounts and stoppage ratio."),
          L("Passive & Index", hubHref("funds", "passive"), "Passive AUM and ETF expansion."),
          L("Geographic AUM", hubHref("funds", "geo-aum"), "State-wise fund adoption."),
          L("Scheme Size", hubHref("funds", "scheme-size"), "Scheme asset concentration."),
        ],
      },
      {
        label: "ETFs",
        desc: "Price against NAV.",
        items: [L("ETF Spreads", hubHref("funds", "etf"), "Price to NAV premium/discount and turnover.", "NEW")],
      },
    ],
  },
  {
    title: "Companies",
    tagline: "Research any listed company",
    groups: [
      {
        label: "Research",
        desc: "What the AI, brokers and our models say.",
        items: [
          L("Company Page", hubHref("companies", "company"), "IR disclosures, timeline and AI what-changed summaries.", "NEW"),
          L("AI Desk", "/research/ai-desk", "Five AI analysts debate a stock, with sources and factor backtests.", "AI"),
          L("Broker Consensus", hubHref("companies", "broker-consensus"), "Broker targets, consensus and what changed."),
          L("MI Research Notes", hubHref("companies", "research-notes"), "Model-driven notes across the coverage list."),
        ],
      },
      {
        label: "Ownership & Risk",
        desc: "Who owns it and what could go wrong.",
        items: [
          L("Company Stress", hubHref("companies", "company-stress"), "Promoter, credit and legal flags together."),
          L("Promoter Tracker", hubHref("companies", "promoters"), "Promoter buying, selling, pledges and insider trades."),
          L("Credit Radar", hubHref("companies", "credit"), "Rating upgrades, downgrades and default watch."),
          L("Legal Risk", hubHref("companies", "legal-risk"), "NCLT, SEBI and court cases involving listed companies."),
        ],
      },
      {
        label: "Buzz & Sentiment",
        desc: "What retail and search data say.",
        items: [
          L("Retail Sentiment", hubHref("companies", "retail-sentiment"), "Reddit chatter, mention spikes and bull/bear theses."),
          L("Search Trends", hubHref("companies", "search-trends"), "Google search interest in companies, IPOs and sectors."),
        ],
      },
      {
        label: "IPOs & Offers",
        desc: "New listings and capital raisings.",
        items: [
          L("IPO Pipeline", hubHref("companies", "ipo"), "Upcoming IPOs, GMP and subscription tracking."),
          L("Bonds, Rights & Buybacks", hubHref("companies", "offers"), "Debenture, rights issue, buyback and offer-for-sale calendars."),
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
          L("Stock Scanner", "/intelligence/scanner", "Nifty 500 scans; 5 free scan types/mo; Daily pass 10, Plus 30, Pro 60.", "NEW"),
          L("Trade Lab", "/intelligence/trade-lab", "RSI, MACD and 13 more indicators, chart patterns and backtests for any index or F&O stock.", "NEW"),
          L("Alerts", hubHref("trade", "alerts"), "Breakout and scan alerts on your schedule."),
          L("Options Flow", "/research/options-flow", "Unusual activity across the options tape.", "AI"),
          L("AI Signals", hubHref("trade", "ai-signals"), "Next-day model with its published track record.", "AI"),
        ],
      },
      {
        label: "Signals & Tests",
        desc: "Backtests and derivatives.",
        items: [
          L("Backtesting", hubHref("trade", "backtesting"), "Test scanner ideas against history."),
          L("Derivatives", hubHref("trade", "derivatives"), "F&O open interest and positioning."),
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
          L("Overview", hubHref("portfolio", "overview"), "Live positions, NAV and P&L."),
          L("Watchlist", hubHref("portfolio", "watchlist"), "Names you're tracking without a position."),
          L("Allocation", hubHref("portfolio", "allocation"), "Your actual exposure vs your targets."),
          L("Trade log", hubHref("portfolio", "activity"), "Every trade and corporate action in one log.", "NEW"),
        ],
      },
      {
        label: "Risk & Improve",
        desc: "How bumpy the ride is, and how to smooth it.",
        items: [
          L("Risk", hubHref("portfolio", "risk"), "Volatility, drawdowns and worst-case estimates."),
          L("Attribution", hubHref("portfolio", "attribution"), "What drove your returns: sectors or stock picks."),
          L("Factor Exposure", hubHref("portfolio", "factors"), "Value, momentum and size tilts in your portfolio."),
          L("Optimizer", hubHref("portfolio", "optimizer"), "Rebalance suggestions for your risk level."),
          L("Tax", hubHref("portfolio", "tax"), "Capital-gains view of your holdings.", "NEW"),
        ],
      },
    ],
  },
];

/** Utility hub: not in the primary bar. Reached from the footer, the header gear and the More menu. */
export const UTILITY_SECTIONS: NavSection[] = [
  {
    title: "Data",
    tagline: "Sources, freshness and export",
    groups: [
      {
        label: "Data Centre",
        desc: "Where the numbers come from.",
        items: [
          L("Sources & Status", hubHref("data", "sources"), "Feed health, data freshness and dataset status."),
          L("Indicators", hubHref("data", "indicators"), "Long-history indicators vs their usual range.", "NEW"),
          L("Data Health", hubHref("data", "health"), "Freshness and provenance of every series."),
          L("Data Feeds", hubHref("data", "feeds"), "Every connected market-data provider."),
          L("World Bank Data", hubHref("data", "world-bank"), "World Bank macro series for India and the US."),
          L("Data Export", hubHref("data", "export"), "Download site datasets as Excel."),
        ],
      },
    ],
  },
];

/** Primary plus utility; used by the footer, wayfinding, page registry and assistant. */
export const ALL_NAV_SECTIONS: NavSection[] = [...NAV_SECTIONS, ...UTILITY_SECTIONS];

/** Default route when tapping a bottom-tab section on mobile (matches START_HERE intent). */
export const SECTION_LANDING_HREF: Record<string, string> = {
  Today: "/Home",
  Markets: "/markets",
  Economy: "/economy",
  "Funds & Flows": "/funds",
  Companies: "/companies",
  Trade: "/trade",
  Portfolio: "/portfolio",
  Data: "/data",
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
  return hrefAllowed("/Home") ? "/Home" : "/markets";
}

/** Beginner shortcuts shown at the top of the full menu. */
export const START_HERE = [
  { label: "Just want today's view?", cta: "Read the 2-minute Daily Brief", href: "/Home?section=brief" },
  { label: "Researching a stock?", cta: "Ask the AI Desk", href: "/research/ai-desk" },
  { label: "Looking for trading ideas?", cta: "Run the Stock Scanner", href: "/intelligence/scanner" },
  { label: "Want to test an idea on real data?", cta: "Try Trade Lab", href: "/intelligence/trade-lab" },
  { label: "Already own stocks?", cta: "Open My Portfolio", href: "/portfolio" },
] as const;

/** Pathname part of a nav href (drops ?section= and #hash). */
export const pathOf = (href: string) => href.split(/[?#]/)[0]!;

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type SitemapSection = { title: string; links: { label: string; href: string }[] };

/** Footer sitemap — derived from NAV_SECTIONS (+ utility) so new pages stay in sync. */
export function buildSitemapSections(): SitemapSection[] {
  return ALL_NAV_SECTIONS.map((section) => ({
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
        const base = pathOf(item.href);
        if (path === base || path.startsWith(base + "/")) {
          if (!best || base.length > pathOf(best.href).length) best = { section, group, href: item.href };
        }
      }
    }
  }
  return best;
}
