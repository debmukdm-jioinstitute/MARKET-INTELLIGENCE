import type { LearnModule } from "../types";

export const DATA_TRUST: LearnModule = {
  slug: "data-trust-and-ai",
  title: "Data, Trust & Using the Platform",
  tagline: "Sources, freshness, exports, AI limits and connecting Claude",
  description:
    "Where the numbers come from, how freshness and provenance are shown, how to export data, how to use AI responsibly, and how to connect Market Intelligence to Claude.",
  level: "Beginner",
  navSection: "Data & Tools",
  accent: { text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-500" },
  chapters: [
    {
      slug: "data-freshness-and-provenance",
      title: "Data sources, freshness and provenance",
      summary: "How to know where a number came from and whether it is still current.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Every figure on the site names its provider. Indian market data comes from NSE and Upstox; macro data from RBI and public open-data portals; global series from Yahoo Finance and FRED. A missing field is shown as unavailable, never estimated.",
          ],
        },
        {
          heading: "Provenance habits",
          paragraphs: [],
          bullets: [
            "Check the as-of time and state badge.",
            "Use the Data Health page to see feed freshness.",
            "Report anything that looks wrong with the in-page issue link.",
          ],
        },
      ],
      takeaways: [
        "Every number should have a source and a timestamp.",
        "Stale or unavailable beats silently wrong.",
        "Report discrepancies; corrections are published.",
      ],
      tools: [
        { label: "Sources & Status", href: "/data", blurb: "Feed health and data freshness." },
        { label: "Data Health", href: "/data/health", blurb: "Freshness and provenance of every series." },
        { label: "Data Feeds", href: "/data/feeds", blurb: "Every connected market-data provider." },
        { label: "Methodology", href: "/methodology", blurb: "Coverage, freshness rules and corrections." },
      ],
      related: ["market-foundations/trading-hours-and-market-states"],
    },
    {
      slug: "exporting-data",
      title: "Exporting data to Excel",
      summary: "Take site datasets into your own models and spreadsheets.",
      minutes: 3,
      sections: [
        {
          paragraphs: [
            "Data Export lets you download site datasets as Excel files for your own analysis. Charts can also be viewed as a table and downloaded as CSV.",
          ],
        },
        {
          heading: "Tips",
          paragraphs: [],
          bullets: [
            "Keep the as-of date with any export.",
            "Note whether prices are adjusted for corporate actions.",
            "Recompute derived metrics from the stated formula if you modify inputs.",
          ],
        },
      ],
      takeaways: [
        "Exports preserve the data; you own the analysis.",
        "Record date and source alongside every export.",
        "Use stated formulas for reproducibility.",
      ],
      tools: [
        { label: "Data Export", href: "/data/export", blurb: "Download site datasets as Excel." },
        { label: "World Bank Data", href: "/data/data360", blurb: "Macro series for India and the US." },
      ],
      related: ["data-trust-and-ai/data-freshness-and-provenance"],
    },
    {
      slug: "how-to-use-ai-responsibly",
      title: "Using AI research responsibly",
      summary: "What AI features do well, where they fail and how to keep your own judgement in charge.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "AI features summarise, compare and argue, which saves time. They can also misread sources, miss recent events or sound confident while wrong.",
          ],
        },
        {
          heading: "Rules of thumb",
          paragraphs: [],
          bullets: [
            "Treat output as a draft of research, not a decision.",
            "Verify the cited sources for any claim that matters.",
            "Look for disagreement between agents or models.",
            "Never size a position from a model's confidence score.",
          ],
        },
        {
          paragraphs: ["Nothing on the site is investment advice. You are responsible for your decisions."],
        },
      ],
      takeaways: [
        "AI accelerates research; it does not replace judgement.",
        "Verify citations.",
        "Confidence from a model is not probability.",
      ],
      tools: [
        { label: "AI Desk", href: "/research/ai-desk", blurb: "Structured multi-agent debate with sources." },
        { label: "Methodology", href: "/methodology", blurb: "AI methodology and limitations." },
      ],
      related: ["sentiment-and-ai/ai-desk-explained"],
    },
    {
      slug: "connect-claude-and-terminal",
      title: "Connect Claude and use the terminal",
      summary: "Ask questions about live market data from Claude, or from the command line.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Market Intelligence exposes read-only market, macro, research, derivatives and scanner data through an MCP connector, so Claude can answer with live site data. A command-line terminal app (mi) builds its menu from the same tools.",
          ],
        },
        {
          heading: "What you can do",
          paragraphs: [],
          bullets: [
            "Ask Claude for a market overview, a stock research pack or scanner results.",
            "Sign in to read your own portfolio, watchlist and alerts through authorised account tools.",
            "Use the Help Centre for the full tool list.",
          ],
        },
      ],
      takeaways: [
        "Same data, different interfaces.",
        "Account tools need sign-in; public tools are read-only.",
        "The Help Centre lists every tool.",
      ],
      tools: [
        { label: "Connect Claude", href: "/connect/claude", blurb: "Set up the MCP connector." },
        { label: "Help Centre", href: "/help", blurb: "Tool list, terminal guide and FAQs." },
      ],
      related: ["data-trust-and-ai/how-to-use-ai-responsibly"],
    },
    {
      slug: "getting-started-with-market-intelligence",
      title: "Getting started: a 10-minute daily routine",
      summary: "A simple order of operations using the site, from the morning brief to the evening review.",
      minutes: 5,
      sections: [
        {
          heading: "Morning (before 9:15)",
          paragraphs: [],
          bullets: [
            "Read the Daily Brief for the day in two minutes.",
            "Scan World Monitor and the economic calendar for events.",
            "Check your watchlist and alerts.",
          ],
        },
        {
          heading: "Midday",
          paragraphs: [],
          bullets: [
            "Open the Stock Scanner for ideas that fit your horizon.",
            "Research a name on its stock page, then ask the AI Desk to argue both sides.",
          ],
        },
        {
          heading: "After close",
          paragraphs: [],
          bullets: [
            "Review portfolio risk and allocation.",
            "Log trades in the activity view.",
            "Set alerts for tomorrow.",
          ],
        },
      ],
      takeaways: [
        "A routine beats scrambling for ideas.",
        "Brief, scan, research, review.",
        "Keep decisions yours.",
      ],
      tools: [
        { label: "Daily Brief", href: "/intelligence/brief", blurb: "The day in two minutes." },
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "Find ideas." },
        { label: "Portfolio", href: "/portfolio", blurb: "Review what you own." },
      ],
      related: ["market-foundations/stock-market-basics"],
    },
  ],
};
