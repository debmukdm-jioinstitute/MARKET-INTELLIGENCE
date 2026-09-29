/**
 * Small static index over the /help page's own accordion sections, so the
 * unified search bar can route a natural-language question ("how to connect
 * market intelligence mcp to claude") straight to the right anchor instead of
 * returning "no results".
 *
 * `id` must match a real `id="…"` on a top-level AccordionItem in
 * help-guide.tsx (enforced by convention, checked visually — see TOP_SECTIONS
 * there) so `/help#${id}` actually opens and scrolls to that section.
 */
export type HelpTopic = {
  id: string;
  title: string;
  blurb: string;
  keywords: string[];
  href: string;
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "mcp",
    title: "Connect Market Intelligence to Claude / Cursor (MCP)",
    blurb: "One MCP URL, no API key — Claude custom connector, Cursor, Claude Code.",
    keywords: [
      "mcp",
      "claude",
      "cursor",
      "connector",
      "connect",
      "claude code",
      "claude desktop",
      "ai assistant",
      "oauth",
      "api key",
      "model context protocol",
      "chatgpt",
    ],
    href: "/help#mcp",
  },
  {
    id: "account",
    title: "Account, sign-in, and portfolio in AI",
    blurb: "mi_sign_in for portfolio/alerts tools; website login is separate from Claude's Allow access.",
    keywords: ["account", "sign in", "login", "password", "portfolio in ai", "mi_sign_in", "email"],
    href: "/help#account",
  },
  {
    id: "terminal",
    title: "The mi terminal app",
    blurb: "Optional command-line menu built on the same MCP tools.",
    keywords: ["terminal", "cli", "mi.mjs", "command line", "mi command"],
    href: "/help#terminal",
  },
  {
    id: "trouble",
    title: "Troubleshooting connector issues",
    blurb: "Fixes for the common Claude/Cursor connection errors.",
    keywords: ["not working", "error", "broken", "rate limit", "troubleshoot", "failed", "stuck", "can't connect", "cannot connect"],
    href: "/help#trouble",
  },
  {
    id: "worldmonitor",
    title: "World monitor",
    blurb: "Embedded global feeds submodule.",
    keywords: ["world monitor", "global feeds", "worldmonitor"],
    href: "/help#worldmonitor",
  },
  {
    id: "website",
    title: "Using the website",
    blurb: "Browser basics for getmarketintelligence.in.",
    keywords: ["website", "browser", "getmarketintelligence", "how to use the site"],
    href: "/help#website",
  },
  {
    id: "start",
    title: "New here? Start here",
    blurb: "What Market Intelligence is and the three ways to use it.",
    keywords: ["start", "getting started", "new user", "onboarding", "what is this", "what is market intelligence"],
    href: "/help#start",
  },
  {
    id: "tools",
    title: "Full MCP tool table",
    blurb: "Every read-only tool your AI assistant can call.",
    keywords: ["tools", "tool list", "mcp tools", "what tools", "full list"],
    href: "/help#tools",
  },
];

function scoreTopic(query: string, topic: HelpTopic): number {
  const q = query.toLowerCase();
  let score = 0;
  for (const kw of topic.keywords) {
    if (q.includes(kw)) score += kw.includes(" ") ? 40 : 20;
  }
  // `topic.title.includes(q)` is only meaningful once `q` is long enough to
  // not be a substring of nearly every title by accident — a 1-2 character
  // query (e.g. "l") is contained in almost any English sentence, which
  // surfaced unrelated help topics ("Claude", "Account", "terminal") on the
  // very first couple of keystrokes. Below that length, only keyword-table
  // hits (already length-gated per keyword above) can score.
  if (q.length >= 3 && topic.title.toLowerCase().includes(q)) score += 30;
  return score;
}

export function searchHelpTopics(query: string, limit = 3): HelpTopic[] {
  const q = query.trim();
  // A 1-2 character query can't distinguish anything meaningful across an
  // 8-topic help index (it's practically guaranteed to substring-match one
  // of the short keywords too) — treat it as "no help match" and let the
  // symbol matcher (which already gates its own fuzzy branch on length) own
  // short queries instead.
  if (!q || q.length < 3) return [];
  return HELP_TOPICS.map((t) => ({ t, s: scoreTopic(q, t) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.t);
}
