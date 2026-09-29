export type HomeAiAgent = {
  id: string;
  name: string;
  role: string;
  desc: string;
  cta: string;
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
    role: "Your assistant",
    desc: "Find anything on the site and understand any tool — just ask in plain words.",
    cta: "Chat with Deb",
    opensAssistant: true,
    badge: "AI",
    accent: "from-violet-500/15 to-violet-500/5 border-violet-500/25",
  },
  {
    id: "brief",
    name: "Brief Agent",
    role: "Daily brief",
    desc: "What moved the market today, with sources — emailed before the open and after the close.",
    cta: "Read today's brief",
    href: "/intelligence/brief",
    badge: "AI",
    accent: "from-blue-500/15 to-blue-500/5 border-blue-500/25",
  },
  {
    id: "signals",
    name: "Signal Agent",
    role: "Market signals",
    desc: "Where Nifty might head tomorrow, how past calls did, and BTST/STBT candidates.",
    cta: "See today's signals",
    href: "/intelligence/ai-signals",
    badge: "AI",
    accent: "from-rose-500/15 to-rose-500/5 border-rose-500/25",
  },
  {
    id: "flow",
    name: "Flow agents",
    role: "Options flow",
    desc: "Watches F&O for unusually big trades — and tells you what they might mean.",
    cta: "Check the flow",
    href: "/research/options-flow",
    badge: "AI",
    accent: "from-amber-500/15 to-amber-500/5 border-amber-500/25",
  },
  {
    id: "algo",
    name: "Algo Agent",
    role: "Nifty algo trader",
    desc: "Software that trades Nifty options during market hours — it handles entries and exits on its own.",
    cta: "See it in action",
    href: "/algo/live",
    badge: "AI",
    accent: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/25",
  },
];
