import {
  listPortalOfferings,
  nudgesForSkill,
  pickDidYouKnow,
  type SkillLevel,
} from "@/lib/site-assistant/education";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { searchSymbols } from "@/lib/feeds/symbol-search";
import { isPortalHrefAllowed, type PortalPageControlRow } from "@/lib/portal-page-access";
import { searchPages } from "@/lib/site-assistant/site-map";
import type { SessionUser } from "@/lib/auth";
import { buildSnapshot, METRICS } from "@/lib/snapshot";
import { latestBriefs } from "@/lib/brief/store";
import { loadPortfolioAnalysisForUser } from "@/lib/portfolio/load-for-user";
import { listRules, recentEvents } from "@/lib/alerts/store";
import { SCANNERS } from "@/lib/scanner/scanners";
import { listWatchlist } from "@/lib/watchlist/store";
import { loadScan } from "@/lib/scanner/store";
import { tool } from "ai";
import { z } from "zod";

const skillSchema = z.enum(["beginner", "intermediate", "advanced"]);

const sectionSchema = z.enum(["Today", "Invest", "Trade", "My Portfolio", "Data & Tools", "all"]);

async function loadPortalControls(): Promise<PortalPageControlRow[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  return (await sql()`
    SELECT href, label, nav_section, nav_group, sort_order, enabled, locked, lock_message, applies_to_children
    FROM portal_page_controls
  `) as PortalPageControlRow[];
}

/**
 * Server-executed tools for streamText. Read tools below run for the signed-in `user` only —
 * every one is scoped to that account (their portfolio, their alerts), never another user's data
 * and never the admin tools. Write actions (add_holding, remove_holding, create_alert,
 * update_settings) are CLIENT tools defined in the API route: they run in the browser through the
 * same hooks the portal UI uses, so localStorage and the server stay in sync, and destructive ones
 * render a confirmation card before executing (see site-assistant-panel.tsx).
 */
export function createServerSiteAssistantTools(user: SessionUser | null) {
  return {
    search_pages: tool({
      description:
        "Search portal pages by name, topic, or path fragment. Returns href, label, and description for each match. Prefer this whenever the user asks where to go.",
      inputSchema: z.object({
        query: z.string().describe("Keywords, page name, or feature (e.g. stress, portfolio risk, IPO)"),
      }),
      execute: async ({ query }) => {
        const controls = await loadPortalControls();
        const pages = searchPages(query, 12).filter((p) =>
          controls.length ? isPortalHrefAllowed(p.href, controls, false) : true,
        );
        return { pages: pages.slice(0, 8) };
      },
    }),
    search_symbols: tool({
      description:
        'Resolve natural-language company names or tickers to symbols (handles spacing/typos like "JP Power" → JPPOWER). Returns symbol, name, market, and researchPath for navigation.',
      inputSchema: z.object({
        query: z.string().describe('Company name or ticker fragment, e.g. "JP Power", "reliance", "AAPL"'),
      }),
      execute: async ({ query }) => {
        const hits = await searchSymbols(query, 8);
        return {
          hits: hits.map((h) => ({
            symbol: h.symbol,
            name: h.name,
            market: h.market,
            exchange: h.exchange ?? null,
            researchPath: `/research/${h.symbol}`,
          })),
        };
      },
    }),
    list_portal_offerings: tool({
      description:
        "List the full portal menu: sections (Today, Invest, Trade, My Portfolio, Data & Tools), task groups, pages, Start Here shortcuts, and AI-tagged tools. Use when explaining what the site offers or matching user goals.",
      inputSchema: z.object({
        section: sectionSchema.optional().describe("Filter to one section, or omit for all"),
        skillLevel: skillSchema.optional().describe("Tailors Start Here shortcuts to learner level"),
      }),
      execute: async ({ section, skillLevel }) =>
        listPortalOfferings(section ?? "all", skillLevel as SkillLevel | undefined),
    }),
    list_education_content: tool({
      description:
        'Return nudges (where to go next) or a "Did you know?" trivia fact about the platform. Use to educate and guide beginners through advanced users.',
      inputSchema: z.object({
        kind: z.enum(["nudge", "trivia", "both"]),
        skillLevel: skillSchema.optional(),
        triviaSeed: z.number().int().optional().describe("Optional index seed for trivia rotation"),
      }),
      execute: async ({ kind, skillLevel, triviaSeed }) => {
        const level = (skillLevel ?? "beginner") as SkillLevel;
        const out: { nudges?: ReturnType<typeof nudgesForSkill>; trivia?: ReturnType<typeof pickDidYouKnow> } = {};
        if (kind === "nudge" || kind === "both") out.nudges = nudgesForSkill(level);
        if (kind === "trivia" || kind === "both") out.trivia = pickDidYouKnow(triviaSeed ?? Date.now());
        return out;
      },
    }),

    get_market_snapshot: tool({
      description:
        "Current values of the site's headline metrics: India/US VIX, NIFTY, USD/INR, Brent, US10Y, India 10Y, FII/DII flow, RBI net liquidity, stress and convergence scores, each with its as-of time. Use for \"what's the market doing?\".",
      inputSchema: z.object({}),
      execute: async () => {
        const s = await buildSnapshot();
        return { asOf: s.asOf, metrics: s.metrics, catalog: METRICS };
      },
    }),
    get_stress_index: tool({
      description:
        "India Macro Stress Index (0-100 heuristic): score, band, per-input components, and the convergence (3+ signal families stressed) state. Not a fitted model — say so if asked how reliable it is.",
      inputSchema: z.object({}),
      execute: async () => (await buildSnapshot()).stress,
    }),
    get_daily_brief: tool({
      description: "Most recently generated pre-market or post-close daily brief, with its cited fact sheet and generation time.",
      inputSchema: z.object({}),
      execute: async () => {
        const [b] = hasDatabase() ? await latestBriefs(1) : [];
        return b ?? { error: "No brief has been generated yet." };
      },
    }),
    get_scanner: tool({
      description:
        "Nifty 500 scanner catalogue with match counts from the latest completed run (scans run on a schedule after each NSE close — this reads results, it does not trigger a new scan). Pass scanner=<id> for that scan's top matches, or symbol=X for every scan currently flagging it.",
      inputSchema: z.object({
        scanner: z.string().max(60).optional().describe("Scanner id from the catalogue"),
        symbol: z.string().max(20).optional(),
      }),
      execute: async ({ scanner, symbol }) => {
        const run = await loadScan().catch(() => null);
        const sy = symbol?.trim().toUpperCase();
        return {
          run: run && { asOf: run.asOf, lastBar: run.lastBar, universe: run.universe, scanned: run.scanned, failed: run.failed },
          scanners: SCANNERS.map((s) => ({ id: s.id, label: s.label, description: s.description, bias: s.bias, matches: run?.scanners[s.id]?.length ?? 0 })),
          symbolHits: sy ? SCANNERS.flatMap((s) => (run?.scanners[s.id] ?? []).filter((r) => r.symbol === sy).map((r) => ({ scanner: s.id, label: s.label, bias: s.bias, ...r }))) : undefined,
          top: scanner ? (run?.scanners[scanner] ?? []).slice(0, 10) : undefined,
        };
      },
    }),
    get_my_portfolio: tool({
      description:
        "The signed-in user's own holdings, settings, and computed NAV / return / risk metrics — nothing about any other account. Use for \"how am I doing?\" or \"what's my risk?\". Quote figures with their as-of time; never invent a number that isn't in the result.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!user || user.guest) return { error: "Guest mode does not save a portfolio. Create a free account to track holdings.", upsell: "/signup" };
        const data = await loadPortfolioAnalysisForUser(user.email);
        if ("error" in data) return data;
        return { settings: data.settings, holdings: data.holdings, analysis: data.analysis };
      },
    }),
    get_my_alerts: tool({
      description:
        "The signed-in user's own alert rules and recently fired events, plus the metric catalog with live values. Use for \"any alerts triggered?\" or before proposing a new alert with create_alert.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!user || user.guest) return { error: "Guest mode does not save alerts. Create a free account to set them up.", upsell: "/signup" };
        const snap = await buildSnapshot().catch(() => null);
        const catalog = Object.entries(METRICS).map(([id, m]) => ({ id, ...m, current: snap?.metrics[id as keyof typeof METRICS] ?? null }));
        if (!hasDatabase()) return { catalog, rules: [], events: [], dbConfigured: false };
        const [rules, events] = await Promise.all([listRules(user.email), recentEvents(user.email)]);
        return { catalog, rules, events, dbConfigured: true };
      },
    }),
    get_my_watchlist: tool({
      description:
        "The signed-in user's own watchlist (names tracked without a position). Use for \"what's on my watchlist?\" or before add_to_watchlist to avoid a duplicate.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!user || user.guest) return { error: "Guest mode does not save a watchlist. Create a free account to track names.", upsell: "/signup" };
        if (!hasDatabase()) return { items: [], dbConfigured: false };
        return { items: await listWatchlist(user.email), dbConfigured: true };
      },
    }),
  };
}

export const clientNavigateTool = tool({
  description:
    "Navigate the user to an allowed portal path. href must come from search_pages, search_symbols (researchPath), or the site map.",
  inputSchema: z.object({
    href: z.string().describe("Portal path starting with /, e.g. /macro/stress or /research/JPPOWER"),
    label: z.string().optional().describe("Human-readable destination name for confirmation"),
  }),
});

export const clientOpenPaletteTool = tool({
  description:
    "Open the global command palette so the user can search symbols, metrics, and pages (Spacebar shortcut when not typing).",
  inputSchema: z.object({
    reason: z.string().optional().describe("Why the palette helps for this request"),
  }),
});

// ---------------------------------------------------------------------------
// Write tools — defined without `execute` so they run as client tools in the
// browser (site-assistant-panel.tsx), through the same hooks the portal UI
// itself uses (useMyPortfolio, /api/alerts). That keeps localStorage and the
// server in sync, and lets destructive ones render a confirmation card before
// anything happens. Every one is scoped to the signed-in user's own session
// cookie — there is no user-id parameter, so Deb cannot act on another
// account. Non-destructive (reversible in one more step): add_holding,
// create_alert. Requires an explicit confirm click: remove_holding,
// update_settings.
// ---------------------------------------------------------------------------

export const clientAddHoldingTool = tool({
  description:
    "Add a holding to the signed-in user's virtual portfolio. Resolve the company name/ticker with search_symbols FIRST and pass its exact symbol/name/market here — never guess a symbol. Reversible (remove_holding undoes it), so this runs immediately without asking to confirm first; just tell the user what you're about to add.",
  inputSchema: z.object({
    market: z.enum(["IN", "US"]),
    symbol: z.string().min(1).max(25),
    name: z.string().min(1).max(120),
    currency: z.enum(["INR", "USD"]),
    shares: z.number().positive().max(1_000_000_000),
    avgCost: z.number().positive().max(100_000_000).describe("Average cost per share, in the holding's own currency"),
    sector: z.string().max(100).optional(),
  }),
});

export const clientRemoveHoldingTool = tool({
  description:
    "Remove a holding from the signed-in user's virtual portfolio. DESTRUCTIVE — the widget shows a confirmation card and only removes it once the user explicitly confirms; do not tell the user it's done until you see a confirmed result.",
  inputSchema: z.object({
    id: z.string().min(1).describe("Holding id or exact symbol, from get_my_portfolio"),
    symbol: z.string().min(1).max(25).describe("Symbol, for the confirmation message"),
  }),
});

export const clientCreateAlertTool = tool({
  description:
    "Create an alert rule for the signed-in user from metrics in get_my_alerts' catalog. Reversible (deletable on /intelligence/alerts), so this runs immediately; show the user the rule you created.",
  inputSchema: z.object({
    name: z.string().min(1).max(80),
    conditions: z
      .array(z.object({ metric: z.string(), op: z.enum(["gt", "gte", "lt", "lte", "eq"]), value: z.number() }))
      .min(1)
      .max(5),
    combinator: z.enum(["all", "any"]).default("all"),
    channels: z.array(z.enum(["push", "email"])).min(1).default(["push"]),
  }),
});

export const clientUpdateSettingsTool = tool({
  description:
    "Change the signed-in user's portfolio name and/or benchmark. Ask what to change if unclear. The widget shows a confirmation card first — do not tell the user it's done until you see a confirmed result.",
  inputSchema: z.object({
    name: z.string().min(1).max(60).optional(),
    benchmark: z.string().max(20).optional().describe("Benchmark id, e.g. NIFTY50, SENSEX — confirm valid ids from the portfolio settings page if unsure"),
  }),
});

export const clientAddToWatchlistTool = tool({
  description:
    "Add a company to the signed-in user's watchlist (tracking without a position). Resolve the company name/ticker with search_symbols FIRST — never guess a symbol. Reversible and non-destructive, so this runs immediately.",
  inputSchema: z.object({
    market: z.enum(["IN", "US"]),
    symbol: z.string().min(1).max(25),
    name: z.string().min(1).max(120),
    sector: z.string().max(100).optional(),
    note: z.string().max(280).optional().describe("Why it's on the list, e.g. \"waiting for a pullback below 1400\""),
  }),
});

export const clientRemoveFromWatchlistTool = tool({
  description:
    "Remove a name from the signed-in user's watchlist. Non-destructive to their portfolio (it never held a position), so this runs immediately without a confirmation card.",
  inputSchema: z.object({
    id: z.string().min(1).describe("Watchlist item id, from get_my_watchlist"),
    symbol: z.string().min(1).max(25).describe("Symbol, for the confirmation message"),
  }),
});
