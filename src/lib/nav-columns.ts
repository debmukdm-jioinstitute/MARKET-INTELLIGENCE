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

/** Organised by what the visitor wants to do, not by data type — 5 sections, each with 2–4 tasks. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Today",
    tagline: "What is happening in markets right now",
    groups: [
      {
        label: "Market Snapshot",
        desc: "Indices, rupee and commodities at a glance.",
        items: [
          { label: "Overview", href: "/markets", desc: "Cross-asset tape: equities, rates, and FX in one board." },
          { label: "India Cockpit", href: "/markets/india", desc: "NSE / BSE headline pulse and index depth." },
          { label: "World indices", href: "/macro/indices", desc: "Global benchmarks — price, range, and 52-week tape.", badge: "NEW" },
          { label: "Currency", href: "/macro/currency", desc: "DXY, USDINR, and cross-currency tape." },
          { label: "Commodities", href: "/macro/commodities", desc: "Crude, gold, and industrial metals." },
        ],
      },
      {
        label: "News & Daily Brief",
        desc: "Start here: a 2-minute read of the day.",
        badge: "AI",
        items: [
          { label: "Daily Brief", href: "/intelligence/brief", desc: "Pre-market and post-close brief with cited sources.", badge: "AI" },
          { label: "Intelligence Feed", href: "/intelligence", desc: "News impact scored for sentiment and relevance.", badge: "AI" },
          { label: "Economic Calendar", href: "/macro/calendar", desc: "Upcoming prints that can move the book." },
        ],
      },
    ],
  },
  {
    title: "Invest",
    tagline: "Long-term investing: research, value, the economy",
    groups: [
      {
        label: "Research Companies",
        desc: "Look up any stock, read reports, track IPOs.",
        items: [
          { label: "Company Workbench", href: "/research", desc: "Snapshots, comparables, and simulated history." },
          { label: "Research Reports", href: "/research-reports", desc: "Model-driven notes across the coverage list." },
          { label: "IPO Pipeline", href: "/research/ipo", desc: "Upcoming listings and subscription tracking." },
        ],
      },
      {
        label: "Valuation & Sectors",
        desc: "Is the market cheap or expensive? Which sectors lead?",
        items: [
          { label: "Valuation", href: "/markets/sectors?tab=valuation", desc: "P/E, P/B, and yield bands versus history." },
          { label: "Sector Comparables", href: "/markets/sectors", desc: "Rotation and relative strength by sector.", badge: "NEW" },
        ],
      },
      {
        label: "Economy & Macro",
        desc: "Growth, inflation, RBI and how they hit stocks.",
        items: [
          { label: "Global Board", href: "/macro", desc: "Regime-first read across growth, inflation, liquidity." },
          { label: "India Macro", href: "/macro/india", desc: "MOSPI, RBI, and fiscal data on one page." },
          { label: "RBI & Liquidity", href: "/macro/rbi", desc: "Policy stance, repo path, and system liquidity." },
          { label: "Global Data", href: "/macro/global", desc: "Cross-country macro series." },
          { label: "Stress Index", href: "/macro/stress", desc: "India macro stress score and cross-signal convergence alerts." },
          { label: "Transmission Map", href: "/macro/transmission", desc: "Measured sector sensitivity to oil, INR, US yields and the S&P.", badge: "NEW" },
          { label: "Scenarios", href: "/macro/scenarios", desc: "Shock oil, INR or yields and see sector and portfolio impact." },
        ],
      },
    ],
  },
  {
    title: "Trade",
    tagline: "Short-term and intraday: scans, signals, options",
    groups: [
      {
        label: "Scanners & Signals",
        desc: "Find stocks that are breaking out right now.",
        badge: "NEW",
        items: [
          { label: "Stock Scanner", href: "/intelligence/scanner", desc: "Live Nifty 500 technical scans: 52-week breakouts, volume gainers, NR7, RSI, MACD and more.", badge: "NEW" },
          { label: "AI Signals", href: "/intelligence/ai-signals", desc: "Nifty next-day model with its walk-forward track record, plus BTST/STBT candidates.", badge: "AI" },
          { label: "Alerts & Scanner Bot", href: "/intelligence/alerts", desc: "Scheduled scans, breakout alerts, and on-demand scanner commands.", badge: "NEW" },
        ],
      },
      {
        label: "Momentum & Breadth",
        desc: "Is the rally broad or narrow?",
        items: [
          { label: "Breadth", href: "/markets/breadth", desc: "Advance/decline and participation signals." },
          { label: "Momentum", href: "/markets/breadth#momentum", desc: "Trend and momentum leaders." },
        ],
      },
      {
        label: "Options & F&O",
        desc: "Open interest, positioning and unusual activity.",
        badge: "AI",
        items: [
          { label: "Options Flow", href: "/research/options-flow", desc: "Unusual activity across the options tape.", badge: "AI" },
          { label: "Derivatives", href: "/markets/derivatives", desc: "F&O open interest and positioning." },
        ],
      },
      {
        label: "Ideas & Backtests",
        desc: "Get AI trade ideas, then test them on history.",
        items: [
          { label: "AI Desk", href: "/research/ai-desk", desc: "Alpha discovery and AI-assisted trade ideas.", badge: "AI" },
          { label: "Backtesting", href: "/intelligence/backtesting", desc: "₹10K growth charts, morning-vs-close P&L, ATR paper trading.", badge: "NEW" },
        ],
      },
      {
        label: "NIFTY Algo Desk",
        desc: "Intraday options research: ML signals, tick backtests, live paper trading.",
        badge: "NEW",
        items: [
          { label: "Dashboard", href: "/algo", desc: "Equity curve, risk profiles, and system status.", badge: "NEW" },
          { label: "Live trading", href: "/algo/live", desc: "Scanner, suggestions, auto/manual execution, open positions.", badge: "NEW" },
          { label: "Trade history", href: "/algo/trades", desc: "Closed trades, P&L breakdown, premium journey charts." },
          { label: "Tick backtest", href: "/algo/backtest", desc: "Replay engine on historical ticks (LOW/MEDIUM/HIGH risk)." },
          { label: "Day replay", href: "/algo/replay", desc: "Fast-forward one historical session with ML + strategies.", badge: "NEW" },
          { label: "Charts & chain", href: "/algo/charts", desc: "NIFTY candles, option chain, premium tick chart." },
          { label: "AI models", href: "/algo/ai", desc: "XGBoost macro/micro/strategy models and RL exit agent.", badge: "AI" },
          { label: "Algo settings", href: "/algo/settings", desc: "Risk profile selector and execution thresholds." },
        ],
      },
    ],
  },
  {
    title: "My Portfolio",
    tagline: "Track and improve your own holdings",
    groups: [
      {
        label: "Holdings",
        desc: "Your positions, value and profit & loss.",
        items: [
          { label: "Command Center", href: "/portfolio", desc: "Mark-to-market NAV, P&L, and live positions." },
          { label: "Allocation", href: "/portfolio/allocation", desc: "Policy weights versus actual exposure." },
        ],
      },
      {
        label: "Risk & Optimise",
        desc: "How risky is it, and how could it be better?",
        items: [
          { label: "Risk & VaR", href: "/portfolio/risk", desc: "Vol, drawdown, and 95% Value-at-Risk." },
          { label: "Attribution", href: "/portfolio/attribution", desc: "Brinson-Fachler sector and security effects." },
          { label: "Quant & Factors", href: "/portfolio/quant", desc: "Factor loadings and systematic betas." },
          { label: "Optimizer", href: "/portfolio/optimizer", desc: "Mean-variance and risk-parity rebalancing." },
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
        desc: "Where the numbers come from; download them.",
        items: [
          { label: "Sources & Status", href: "/data", desc: "Feed health, sources, and data freshness." },
          { label: "Data Health", href: "/data/health", desc: "Freshness and provenance of every collected series." },
          { label: "Data Feeds", href: "/data/feeds", desc: "Full list of connected market data providers." },
          { label: "Data360 Explorer", href: "/data/data360", desc: "World Bank Data360 mirror — India and US macro series." },
          { label: "Data Export", href: "/data/export", desc: "Download every dataset on the site as one structured Excel workbook.", badge: "NEW" },
        ],
      },
      {
        label: "External Brief (Bazaarbrief)",
        desc: "A short, external read on the day's market narrative.",
        items: [
          { label: "External Brief (Bazaarbrief)", href: "https://abhisheksi2o.github.io/Bazaarbrief/", desc: "A short, external read on the day's market narrative.", external: true },
        ],
      },
    ],
  },
];

/** Beginner shortcuts shown at the top of the full menu. */
export const START_HERE = [
  { label: "Just want today's view?", cta: "Read the Daily Brief", href: "/intelligence/brief" },
  { label: "Investing for the long term?", cta: "Open Company Workbench", href: "/research" },
  { label: "Trading short-term?", cta: "Open Stock Scanner", href: "/intelligence/scanner" },
  { label: "Own stocks already?", cta: "Open My Portfolio", href: "/portfolio" },
] as const;

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
