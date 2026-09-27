export type HomeAiAgent = {
  id: string;
  name: string;
  role: string;
  desc: string;
  href?: string;
  badge?: "AI" | "NEW";
  opensAssistant?: boolean;
  accent: string;
};

/** Five product-facing AI agents surfaced on /Home. */
export const HOME_AI_AGENTS: HomeAiAgent[] = [
  {
    id: "ask-deb",
    name: "Ask Deb",
    role: "Portal copilot",
    desc: "Navigate Today · Invest · Trade · Portfolio · Data, explain tools, run commands.",
    opensAssistant: true,
    badge: "AI",
    accent: "from-violet-500/15 to-violet-500/5 border-violet-500/25",
  },
  {
    id: "brief",
    name: "Brief Agent",
    role: "Daily narrative",
    desc: "Pre-market and post-close brief with cited sources and email delivery.",
    href: "/intelligence/brief",
    badge: "AI",
    accent: "from-blue-500/15 to-blue-500/5 border-blue-500/25",
  },
  {
    id: "signals",
    name: "Signal Agent",
    role: "Models & scans",
    desc: "Nifty next-day model, walk-forward track record, BTST/STBT candidates.",
    href: "/intelligence/ai-signals",
    badge: "AI",
    accent: "from-rose-500/15 to-rose-500/5 border-rose-500/25",
  },
  {
    id: "flow",
    name: "Flow agents",
    role: "Options pipeline",
    desc: "Data gatherer, analysis narrator, and flagging shortlist on F&O unusual activity.",
    href: "/research/options-flow",
    badge: "AI",
    accent: "from-amber-500/15 to-amber-500/5 border-amber-500/25",
  },
  {
    id: "algo",
    name: "Algo Agent",
    role: "NIFTY ML desk",
    desc: "XGBoost macro/micro/strategy stacks plus RL exit on the intraday options desk.",
    href: "/algo/ai",
    badge: "AI",
    accent: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/25",
  },
];
