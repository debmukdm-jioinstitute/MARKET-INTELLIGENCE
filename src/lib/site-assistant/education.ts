import { NAV_SECTIONS, START_HERE, type NavSection } from "@/lib/nav-columns";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export type McqOption = { id: string; label: string; points: { beginner: number; intermediate: number; advanced: number } };

export type McqQuestion = {
  id: string;
  prompt: string;
  options: McqOption[];
};

/** Short skill check — scores toward beginner / intermediate / advanced. */
export const SKILL_MCQ: McqQuestion[] = [
  {
    id: "markets",
    prompt: "How often do you follow markets?",
    options: [
      { id: "rare", label: "I'm just getting started", points: { beginner: 3, intermediate: 1, advanced: 0 } },
      { id: "weekly", label: "A few times a week", points: { beginner: 1, intermediate: 3, advanced: 1 } },
      { id: "daily", label: "Every trading day", points: { beginner: 0, intermediate: 1, advanced: 3 } },
    ],
  },
  {
    id: "goal",
    prompt: "What do you want from this app first?",
    options: [
      { id: "learn", label: "Understand markets & learn the basics", points: { beginner: 3, intermediate: 1, advanced: 0 } },
      { id: "invest", label: "Research companies for investing", points: { beginner: 1, intermediate: 3, advanced: 1 } },
      { id: "trade", label: "Scans, signals & short-term tools", points: { beginner: 0, intermediate: 2, advanced: 3 } },
    ],
  },
  {
    id: "tools",
    prompt: "Which tools have you used before?",
    options: [
      { id: "none", label: "None — show me the simple path", points: { beginner: 3, intermediate: 0, advanced: 0 } },
      { id: "some", label: "Charts, news, or a broker app", points: { beginner: 1, intermediate: 3, advanced: 1 } },
      { id: "pro", label: "Backtests, options flow, or quant metrics", points: { beginner: 0, intermediate: 1, advanced: 3 } },
    ],
  },
  {
    id: "portfolio",
    prompt: "Do you track a portfolio here?",
    options: [
      { id: "no", label: "Not yet", points: { beginner: 2, intermediate: 1, advanced: 0 } },
      { id: "yes-basic", label: "Yes — holdings & P&L", points: { beginner: 1, intermediate: 3, advanced: 1 } },
      { id: "yes-risk", label: "Yes — I care about VaR, factors & optimization", points: { beginner: 0, intermediate: 1, advanced: 3 } },
    ],
  },
];

export function scoreSkillFromMcq(answers: Record<string, string>): SkillLevel {
  const totals = { beginner: 0, intermediate: 0, advanced: 0 };
  for (const q of SKILL_MCQ) {
    const optionId = answers[q.id];
    const opt = q.options.find((o) => o.id === optionId);
    if (!opt) continue;
    totals.beginner += opt.points.beginner;
    totals.intermediate += opt.points.intermediate;
    totals.advanced += opt.points.advanced;
  }
  const entries = Object.entries(totals) as [SkillLevel, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]![1] > 0 ? entries[0]![0] : "beginner";
}

export type DidYouKnow = { fact: string; href?: string; label?: string };

export const DID_YOU_KNOW: DidYouKnow[] = [
  {
    fact: "The Daily Brief is a 2-minute, source-cited read — a good first stop every morning.",
    href: "/intelligence/brief",
    label: "Open Daily Brief",
  },
  {
    fact: "Press ⌘K (or Space when not typing) to search any symbol, metric, or page instantly.",
  },
  {
    fact: "The Stock Scanner runs 27 technical setups across Nifty 500 after each close.",
    href: "/intelligence/scanner",
    label: "Try scanner",
  },
  {
    fact: "AI Signals shows its walk-forward track record next to the prediction — no hidden confidence theater.",
    href: "/intelligence/ai-signals",
    label: "See AI Signals",
  },
  {
    fact: "Macro Stress Index combines volatility, FX, rates, and flows into one India stress score.",
    href: "/macro/stress",
    label: "Stress index",
  },
  {
    fact: "Data Health tells you how fresh every feed is — no silent stale numbers.",
    href: "/data/health",
    label: "Data Health",
  },
  {
    fact: "Backtesting replays scanner setups over two years with honest out-of-sample checks.",
    href: "/intelligence/backtesting",
    label: "Backtests",
  },
  {
    fact: "Portfolio Risk shows VaR and drawdown once you add holdings — start at Command Center.",
    href: "/portfolio",
    label: "Portfolio",
  },
];

export function pickDidYouKnow(seed = 0): DidYouKnow {
  const i = Math.abs(seed) % DID_YOU_KNOW.length;
  return DID_YOU_KNOW[i]!;
}

export type Nudge = { title: string; body: string; href: string; cta: string; badge?: "AI" | "NEW" };

const BEGINNER_NUDGES: Nudge[] = [
  {
    title: "Start with Today",
    body: "Read the Daily Brief for a plain-English snapshot of the day.",
    href: "/intelligence/brief",
    cta: "Daily Brief",
    badge: "AI",
  },
  {
    title: "See the market",
    body: "Market Snapshot shows indices, rupee, and commodities in one place.",
    href: "/markets",
    cta: "Market Snapshot",
  },
  {
    title: "Look up a company",
    body: "Company Workbench explains a stock without jargon overload.",
    href: "/research",
    cta: "Research",
  },
];

const INTERMEDIATE_NUDGES: Nudge[] = [
  {
    title: "Sector & valuation",
    body: "Check if the market looks cheap and which sectors are leading.",
    href: "/markets/valuation",
    cta: "Valuation",
  },
  {
    title: "Breadth & momentum",
    body: "See if the rally is broad or only a few names.",
    href: "/markets/breadth",
    cta: "Breadth",
  },
  {
    title: "India macro",
    body: "Growth, inflation, RBI — tied to how stocks behave.",
    href: "/macro/india",
    cta: "India macro",
  },
];

const ADVANCED_NUDGES: Nudge[] = [
  {
    title: "Scanners & backtests",
    body: "Breakout scans plus historical replay with out-of-sample discipline.",
    href: "/intelligence/scanner",
    cta: "Scanner",
    badge: "NEW",
  },
  {
    title: "Options & AI flow",
    body: "Unusual options activity and AI-assisted desk ideas.",
    href: "/research/options-flow",
    cta: "Options flow",
    badge: "AI",
  },
  {
    title: "Portfolio quant",
    body: "Factors, attribution, and mean-variance optimization.",
    href: "/portfolio/quant",
    cta: "Quant",
  },
];

export function nudgesForSkill(level: SkillLevel): Nudge[] {
  if (level === "beginner") return BEGINNER_NUDGES;
  if (level === "advanced") return ADVANCED_NUDGES;
  return INTERMEDIATE_NUDGES;
}

export function suggestionsForSkill(level: SkillLevel): string[] {
  if (level === "beginner") {
    return [
      "I'm new — where should I start today?",
      "Explain the Daily Brief in simple terms",
      "Take me to market overview",
      "What is this app for?",
    ];
  }
  if (level === "advanced") {
    return [
      "Open scanner and explain the setups",
      "Compare backtest vs out-of-sample results",
      "Show stress index and transmission map",
      "Portfolio factor exposure — where?",
    ];
  }
  return [
    "Take me to the Nifty scanner",
    "Is the market expensive right now?",
    "Open India macro dashboard",
    "Where is portfolio risk?",
  ];
};

export type OfferingGroup = {
  section: string;
  tagline: string;
  group: string;
  groupDesc: string;
  badge?: "AI" | "NEW";
  pages: { href: string; label: string; desc: string; badge?: "AI" | "NEW"; external?: boolean }[];
};

export function listPortalOfferings(sectionFilter?: string, skillLevel?: SkillLevel): {
  startHere: typeof START_HERE;
  sections: OfferingGroup[];
  aiTools: { href: string; label: string; desc: string }[];
} {
  const sections: OfferingGroup[] = [];
  const aiTools: { href: string; label: string; desc: string }[] = [];

  for (const section of NAV_SECTIONS) {
    if (sectionFilter && sectionFilter !== "all" && section.title !== sectionFilter) continue;
    for (const group of section.groups) {
      const pages = group.items.map((i) => ({
        href: i.href,
        label: i.label,
        desc: i.desc,
        badge: i.badge,
        external: i.external,
      }));
      sections.push({
        section: section.title,
        tagline: section.tagline,
        group: group.label,
        groupDesc: group.desc,
        badge: group.badge,
        pages,
      });
      for (const p of group.items) {
        if (p.badge === "AI" && !p.external) {
          aiTools.push({ href: p.href, label: p.label, desc: p.desc });
        }
      }
    }
  }

  let startHere = [...START_HERE];
  if (skillLevel === "beginner") {
    startHere = startHere.filter((s) => s.href === "/intelligence/brief" || s.href === "/research");
  } else if (skillLevel === "advanced") {
    startHere = startHere.filter((s) => s.href === "/intelligence/scanner" || s.href === "/portfolio");
  }

  return { startHere, sections, aiTools };
}

export function offeringsOutlineForPrompt(maxSections: NavSection[] = NAV_SECTIONS): string {
  const lines: string[] = [
    "Portal map (Today / Invest / Trade / My Portfolio / Data & Tools):",
    ...START_HERE.map((s) => `Start here: ${s.label} → ${s.href} (${s.cta})`),
  ];
  for (const section of maxSections) {
    lines.push(`\n[${section.title}] ${section.tagline}`);
    for (const g of section.groups) {
      lines.push(`- ${g.label}: ${g.desc}${g.badge ? ` (${g.badge})` : ""}`);
      for (const item of g.items) {
        if (item.external) continue;
        lines.push(`  · ${item.href} — ${item.label}${item.badge ? ` [${item.badge}]` : ""}: ${item.desc}`);
      }
    }
  }
  return lines.join("\n");
}

export function skillGuidanceForPrompt(level: SkillLevel | undefined): string {
  if (!level) {
    return (
      "Learner profile: unknown. Gently ask if they are new to markets; offer a quick 4-question skill check or infer from their questions. Default to beginner-friendly language until they ask for depth."
    );
  }
  const map: Record<SkillLevel, string> = {
    beginner:
      "Learner profile: BEGINNER. Use plain language, define terms (P/E, F&O, VaR). Nudge toward Daily Brief, Market Snapshot, and Research. Avoid assuming they know scanners or quant tools unless they ask.",
    intermediate:
      "Learner profile: INTERMEDIATE. Balance context with efficiency. Nudge valuation, breadth, macro, portfolio risk. Introduce AI tools when relevant.",
    advanced:
      "Learner profile: ADVANCED. You can use market jargon. Prioritize scanners, backtests, options flow, stress/transmission, quant/optimizer. Still cite where on the site to click.",
  };
  return map[level];
}
