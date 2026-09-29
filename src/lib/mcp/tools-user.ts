import { generateText } from "ai";
import { chainRowsFromSnapshot } from "@/lib/optionstrat/chain-from-snapshot";
import { optionContextForFnoIndex, pickExpiryForTheta } from "@/lib/optionstrat/fno-index-options";
import { recommendStrategies, type MarketBias, type RiskProfile } from "@/lib/optionstrat/strategy-recommender";
import { fetchUpstoxOptionChain, fetchUpstoxOptionExpiries } from "@/lib/feeds/sources/upstox/option-chain";
import { loadPortfolioAnalysisForUser } from "@/lib/portfolio/load-for-user";
import {
  addHoldingForEmail,
  importHoldingsForEmail,
  removeHoldingForEmail,
  sellHoldingForEmail,
  updatePortfolioSettingsForEmail,
} from "@/lib/portfolio/server-mutations";
import { estimateIndiaPortfolioTax } from "@/lib/my-portfolio/india-tax-estimate";
import { createRule, deleteRule, listRules, recentEvents, RuleInput, setRuleActive } from "@/lib/alerts/store";
import { addToWatchlist, listWatchlist, removeFromWatchlist, WatchlistAddInput } from "@/lib/watchlist/store";
import { parseStatementRows, textToRows } from "@/lib/brokers/universal-statement-parser";
import { buildSnapshot, METRICS } from "@/lib/snapshot";
import { hasDatabase, ensureSchema, sql } from "@/lib/db";
import { CRONS, defaultFlagEnabled, ENV_VARS, FLAGS } from "@/lib/admin/system";
import { getFnoIndex, type FnoIndexId } from "@/lib/scanner/fno-indices";
import { buildSiteAssistantSystemPrompt } from "@/lib/site-assistant/prompt";
import { selectSiteAssistantTier } from "@/lib/site-assistant/select-tier";
import { ragContextForQuestion } from "@/lib/site-assistant/rag-context";
import { checkSiteAssistantRateLimit } from "@/lib/site-assistant/rate-limit";
import { SiteAssistantConfigError } from "@/lib/ai/omniroute";
import { sessionFromToken, type McpCallContext } from "@/lib/mcp/context";
import type { Tool } from "@/lib/mcp/tools";
import { mcpSignIn } from "@/lib/mcp/sign-in";
import { z } from "zod";

const empty = { type: "object", properties: {}, additionalProperties: false };

function requireUser(ctx: McpCallContext, args?: Record<string, unknown>) {
  if (ctx.user) return ctx.user;
  if (typeof args?.sessionToken === "string") {
    const u = sessionFromToken(args.sessionToken.trim());
    if (u) return u;
  }
  throw new Error("Sign in required: please call mi_sign_in with your email and password first.");
}

export const USER_TOOLS: Tool[] = [
  {
    name: "mi_sign_in",
    title: "Sign in (MCP)",
    category: "Account",
    access: "auth",
    description:
      "Email/password sign-in for MCP clients. Security warning: Passing credentials in tool arguments sends your password through the AI provider's context window. Use a dedicated password or OAuth where available. Returns a sessionToken with 7-day validity — pass it on later calls as X-MI-Session or Authorization: Bearer.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        password: { type: "string", description: "Account password (same as the website)" },
      },
      required: ["email", "password"],
      additionalProperties: false,
    },
    run: async (args) => {
      const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(args);
      const res = await mcpSignIn(email, password);
      if (!res.ok) return res;
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      return {
        ok: true,
        sessionToken: res.sessionToken,
        expiresAt,
        user: { email: res.user.email, name: res.user.name, role: res.user.role },
        hint: "Send header X-MI-Session: <sessionToken> (or Authorization: Bearer <sessionToken>) on user-scoped tools.",
      };
    },
  },
  {
    name: "mi_session_status",
    title: "Session status",
    category: "Account",
    access: "auth",
    description: "Who the current MCP session is, active account profile, or instructions to sign in.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string", description: "Optional session token from mi_sign_in" },
      },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      let user = ctx.user;
      if (!user && typeof args?.sessionToken === "string") {
        user = sessionFromToken(String(args.sessionToken).trim());
      }
      if (!user) {
        return {
          ok: false,
          active: false,
          authenticated: false,
          message:
            "Not signed in. To access your portfolio, alert rules, or account features, call the mi_sign_in tool with your email and password.",
          user: null,
        };
      }
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      return { ok: true, active: true, authenticated: true, expiresAt, user: { email: user.email, name: user.name, role: user.role } };
    },
  },
  {
    name: "get_optionstrat_recommend",
    title: "Options strategy lab",
    category: "Account",
    access: "user",
    description:
      "OptionStrat-style theta spread recommendations on NIFTY / BANK NIFTY / FINNIFTY (Upstox chain). Same as AI Signals options lab.",
    inputSchema: {
      type: "object",
      properties: {
        index: { type: "string", description: "nifty50 | banknifty | finnifty" },
        bias: { type: "string", enum: ["bullish", "neutral", "bearish"] },
        risk: { type: "string", enum: ["conservative", "balanced", "aggressive"] },
      },
      required: ["index"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      requireUser(ctx);
      const indexId = z.object({ index: z.string() }).parse(args).index as FnoIndexId;
      const bias = (args.bias as MarketBias | undefined) ?? "neutral";
      const risk = (args.risk as RiskProfile | undefined) ?? "balanced";
      getFnoIndex(indexId);
      const ctxOpt = optionContextForFnoIndex(indexId);
      if (!ctxOpt) return { ok: false, error: "Supported: NIFTY, BANK NIFTY, FINNIFTY only." };

      const expiries = await fetchUpstoxOptionExpiries(ctxOpt.underlyingKey);
      const expiry = pickExpiryForTheta(expiries);
      if (!expiry) return { ok: false, error: "No suitable expiry." };

      const snapshot = await fetchUpstoxOptionChain(ctxOpt.underlyingKey, ctxOpt.label, expiry);
      if (!snapshot?.rows.length) return { ok: false, error: "Option chain empty — check Upstox credentials." };

      const chain = chainRowsFromSnapshot(snapshot, expiry);
      const recommendations = recommendStrategies(chain, snapshot.underlyingSpot, bias, risk, ctxOpt.wingWidth, ctxOpt.lotSize);

      return {
        ok: true,
        underlying: ctxOpt.label,
        spot: snapshot.underlyingSpot,
        expiry,
        bias,
        risk_profile: risk,
        recommendations,
      };
    },
  },
  {
    name: "get_my_portfolio",
    title: "My portfolio",
    category: "Account",
    access: "user",
    description: "Holdings, settings, and computed NAV / risk metrics for the signed-in account. Pass sessionToken if headers cannot be sent.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string", description: "Optional sessionToken from mi_sign_in" },
      },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const data = await loadPortfolioAnalysisForUser(user.email);
      if ("error" in data) return data;
      return {
        settings: data.settings,
        holdings: data.holdings,
        analysis: data.analysis,
      };
    },
  },
  {
    name: "get_my_alerts",
    title: "My alerts",
    category: "Account",
    access: "user",
    description: "Alert metric catalog with live values, your rules, and recent fired events. Pass sessionToken if headers cannot be sent.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string", description: "Optional sessionToken from mi_sign_in" },
      },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const snap = await buildSnapshot().catch(() => null);
      const catalog = Object.entries(METRICS).map(([id, m]) => ({
        id,
        ...m,
        current: snap?.metrics[id as keyof typeof METRICS] ?? null,
      }));
      if (!hasDatabase()) return { catalog, rules: [], events: [], dbConfigured: false };
      const [rules, events] = await Promise.all([listRules(user.email), recentEvents(user.email)]);
      return { catalog, rules, events, dbConfigured: true };
    },
  },
  {
    name: "ask_site_assistant",
    title: "Site assistant (one shot)",
    category: "Account",
    access: "user",
    description:
      "Single-turn site Q&A (navigation, features, data). Same brain as the floating assistant; streaming UI is portal-only.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Your question about the site or markets on the site" },
        pathname: { type: "string", description: "Optional page context, e.g. /intelligence/ai-signals" },
      },
      required: ["question"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx);
      const { question, pathname } = z
        .object({ question: z.string().min(1).max(2000), pathname: z.string().max(120).default("/") })
        .parse(args);

      const limited = checkSiteAssistantRateLimit(user.email);
      if (!limited.ok) return { error: `Rate limited — retry in ${limited.retryAfterSec}s.` };

      const ragSnippet = await ragContextForQuestion(question);
      const system = buildSiteAssistantSystemPrompt(pathname, ragSnippet, undefined);

      try {
        const tier = await selectSiteAssistantTier(system);
        const { text } = await generateText({
          model: tier.model,
          system,
          prompt: question,
          maxOutputTokens: 1200,
        });
        return { answer: text, provider: tier.label };
      } catch (e) {
        if (e instanceof SiteAssistantConfigError) return { error: e.message, setupRequired: true };
        throw e;
      }
    },
  },
  {
    name: "get_data_export_info",
    title: "Data export",
    category: "Account",
    access: "user",
    description:
      "What the site Excel export contains and how to download it (browser or curl with session). Binary workbook is not inlined in MCP.",
    inputSchema: empty,
    run: async (_args, ctx) => {
      requireUser(ctx);
      return {
        downloadPath: "/api/export/xlsx?agree=1",
        method: "GET",
        auth: "Same session token as MCP (Cookie mi_session or X-MI-Session on the HTTP download request)",
        limit: "4 downloads per hour per account",
        includes:
          "Macro tape, India hub, stress, transmission, scanners, signals summary, reference sheets — not private portfolio data.",
        terms: "Personal use only; accept terms on /data/export before download.",
      };
    },
  },
  {
    name: "get_admin_system",
    title: "Admin system status",
    category: "Account",
    access: "admin",
    description: "Cron registry, env var checklist, DB counts, feature flags — admin role only.",
    inputSchema: empty,
    run: async (_args, ctx) => {
      const user = requireUser(ctx);
      if (user.role !== "admin") return { error: "Admin role required." };

      const env = ENV_VARS.map((v) => ({
        ...v,
        set: Boolean(
          process.env[v.key] ||
            (v.key === "DATABASE_URL" && (process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED)) ||
            (v.key === "AUTH_SECRET" && process.env.SESSION_SECRET),
        ),
      }));

      if (!hasDatabase()) {
        return { db: false, crons: CRONS, env, flags: FLAGS, stats: {}, cronSecretSet: Boolean(process.env.CRON_SECRET) };
      }

      await ensureSchema();
      const d = sql();
      let flags = FLAGS.map((f) => ({ ...f, enabled: defaultFlagEnabled(f.flag) }));
      try {
        const rows = (await d`SELECT flag, enabled FROM feature_flags`) as unknown as { flag: string; enabled: boolean }[];
        flags = FLAGS.map((f) => ({ ...f, enabled: rows.find((r) => r.flag === f.flag)?.enabled ?? defaultFlagEnabled(f.flag) }));
      } catch {
        /* optional table */
      }

      const tables = ["users", "scan_latest", "research_reports", "alert_rules"];
      const stats: Record<string, number | null> = {};
      for (const t of tables) {
        try {
          const r = (await d.query(`SELECT count(*)::int AS n FROM ${t}`)) as unknown as { n: number }[];
          stats[t] = r[0]?.n ?? 0;
        } catch {
          stats[t] = null;
        }
      }

      return { db: true, crons: CRONS, env, flags, stats, cronSecretSet: Boolean(process.env.CRON_SECRET) };
    },
  },
  {
    name: "get_my_watchlist",
    title: "My watchlist",
    category: "Watchlist",
    access: "user",
    description: "Symbols you track without a position. Pass sessionToken if headers cannot be sent.",
    inputSchema: {
      type: "object",
      properties: { sessionToken: { type: "string" } },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      if (!hasDatabase()) return { items: [], dbConfigured: false };
      return { items: await listWatchlist(user.email), dbConfigured: true };
    },
  },
  {
    name: "add_to_watchlist",
    title: "Add to watchlist",
    category: "Watchlist",
    access: "user",
    description: "Track a symbol without a portfolio line. Resolve symbol with search_symbols first.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        market: { type: "string", enum: ["IN", "US"] },
        symbol: { type: "string" },
        name: { type: "string" },
        sector: { type: "string" },
        note: { type: "string" },
      },
      required: ["market", "symbol", "name"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const input = WatchlistAddInput.parse(args);
      const item = await addToWatchlist(user.email, input);
      return { item };
    },
  },
  {
    name: "remove_from_watchlist",
    title: "Remove from watchlist",
    category: "Watchlist",
    access: "user",
    description: "Remove by watchlist item id from get_my_watchlist.",
    inputSchema: {
      type: "object",
      properties: { sessionToken: { type: "string" }, id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const id = z.object({ id: z.string().min(1) }).parse(args).id;
      await removeFromWatchlist(user.email, id);
      return { ok: true };
    },
  },
  {
    name: "add_holding",
    title: "Add portfolio holding",
    category: "Portfolio",
    access: "user",
    description:
      "Add or merge a holding (same market+symbol merges average cost). Requires DB-backed account. Use search_symbols first.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        market: { type: "string", enum: ["IN", "US"] },
        symbol: { type: "string" },
        name: { type: "string" },
        currency: { type: "string", enum: ["INR", "USD"] },
        shares: { type: "number" },
        avgCost: { type: "number" },
        sector: { type: "string" },
        addedAt: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["market", "symbol", "name", "currency", "shares", "avgCost"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      return addHoldingForEmail(user.email, args);
    },
  },
  {
    name: "remove_holding",
    title: "Remove portfolio holding",
    category: "Portfolio",
    access: "user",
    description: "Remove entire position by holding id or symbol from get_my_portfolio.",
    inputSchema: {
      type: "object",
      properties: { sessionToken: { type: "string" }, id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const id = z.object({ id: z.string().min(1) }).parse(args).id;
      return removeHoldingForEmail(user.email, id);
    },
  },
  {
    name: "sell_holding",
    title: "Sell / trim holding",
    category: "Portfolio",
    access: "user",
    description: "Partial or full sell with price and optional trade date. Updates trade log and shares.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        id: { type: "string", description: "Holding uuid from get_my_portfolio" },
        shares: { type: "number" },
        price: { type: "number" },
        tradeDate: { type: "string" },
      },
      required: ["id", "shares", "price"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const { id, ...rest } = z
        .object({ id: z.string().min(1), shares: z.number(), price: z.number(), tradeDate: z.string().optional() })
        .parse(args);
      return sellHoldingForEmail(user.email, id, rest);
    },
  },
  {
    name: "update_portfolio_settings",
    title: "Portfolio settings",
    category: "Portfolio",
    access: "user",
    description: "Change portfolio display name and/or benchmark id (NIFTY50, SENSEX, …).",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        name: { type: "string" },
        benchmark: { type: "string" },
        cashInr: { type: "number" },
      },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      return updatePortfolioSettingsForEmail(user.email, args);
    },
  },
  {
    name: "parse_portfolio_statement",
    title: "Parse broker statement",
    category: "Portfolio",
    access: "user",
    description:
      "Parse pasted CSV/statement text into holdings preview (any broker). Does not save — follow with import_portfolio_holdings.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        text: { type: "string" },
        brokerHint: { type: "string" },
        defaultMarket: { type: "string", enum: ["IN", "US"] },
      },
      required: ["text"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      requireUser(ctx, args);
      const { text, brokerHint, defaultMarket } = z
        .object({
          text: z.string().min(10).max(500_000),
          brokerHint: z.string().max(80).optional(),
          defaultMarket: z.enum(["IN", "US"]).optional(),
        })
        .parse(args);
      const rows = textToRows(text);
      return parseStatementRows(rows, text.slice(0, 500), { brokerHint, defaultMarket });
    },
  },
  {
    name: "import_portfolio_holdings",
    title: "Import holdings",
    category: "Portfolio",
    access: "user",
    description:
      "Commit holdings array (from parse_portfolio_statement). mode=replace clears DB book first; append merges duplicates.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        mode: { type: "string", enum: ["replace", "append"] },
        holdings: { type: "array", items: { type: "object" } },
      },
      required: ["holdings"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const { holdings, mode } = z
        .object({
          holdings: z.array(z.record(z.string(), z.unknown())),
          mode: z.enum(["replace", "append"]).default("replace"),
        })
        .parse(args);
      return importHoldingsForEmail(user.email, holdings, mode);
    },
  },
  {
    name: "get_my_portfolio_activity",
    title: "Portfolio activity",
    category: "Portfolio",
    access: "user",
    description: "Trade log and approximate realized P&L for the signed-in account.",
    inputSchema: {
      type: "object",
      properties: { sessionToken: { type: "string" } },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const data = await loadPortfolioAnalysisForUser(user.email);
      if ("error" in data) return data;
      const avgCostBySymbol = new Map(data.holdings.map((h) => [h.symbol.toUpperCase(), h.avgCost]));
      let realizedGainInr = 0;
      for (const t of data.tradeLog.filter((x) => x.side === "SELL")) {
        const basis = avgCostBySymbol.get(t.symbol.toUpperCase()) ?? t.price;
        realizedGainInr += (t.price - basis) * t.shares;
      }
      return {
        trades: [...data.tradeLog].reverse().slice(0, 100),
        realizedGainInr,
        unrealizedGainInr: data.analysis.positions.reduce((s, p) => s + p.pnlInr, 0),
      };
    },
  },
  {
    name: "get_my_portfolio_tax",
    title: "Portfolio tax estimate",
    category: "Portfolio",
    access: "user",
    description: "Illustrative India STCG/LTCG estimate on your book — not tax advice.",
    inputSchema: {
      type: "object",
      properties: { sessionToken: { type: "string" } },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const data = await loadPortfolioAnalysisForUser(user.email);
      if ("error" in data) return data;
      const addedAtBySymbol = new Map(data.holdings.map((h) => [h.symbol.toUpperCase(), h.addedAt]));
      const avgCostBySymbol = new Map(data.holdings.map((h) => [h.symbol.toUpperCase(), h.avgCost]));
      return estimateIndiaPortfolioTax({
        positions: data.analysis.positions,
        tradeLog: data.tradeLog,
        avgCostBySymbol,
        addedAtBySymbol,
        fxRate: 87,
      });
    },
  },
  {
    name: "create_alert",
    title: "Create alert rule",
    category: "Alerts",
    access: "user",
    description: "Create alert from metrics in get_my_alerts catalog (metric ids, op, value).",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        name: { type: "string" },
        conditions: { type: "array", items: { type: "object" } },
        combinator: { type: "string", enum: ["all", "any"] },
        channels: { type: "array", items: { type: "string", enum: ["push", "email"] } },
        cooldownHours: { type: "number" },
      },
      required: ["name", "conditions"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      if (!hasDatabase()) return { error: "No database configured" };
      const input = RuleInput.parse(args);
      return { rule: await createRule(user.email, input) };
    },
  },
  {
    name: "delete_alert",
    title: "Delete alert rule",
    category: "Alerts",
    access: "user",
    description: "Delete alert rule by id from get_my_alerts.",
    inputSchema: {
      type: "object",
      properties: { sessionToken: { type: "string" }, id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const id = z.object({ id: z.string().min(1) }).parse(args).id;
      await deleteRule(user.email, id);
      return { ok: true };
    },
  },
  {
    name: "set_alert_active",
    title: "Enable/disable alert",
    category: "Alerts",
    access: "user",
    description: "Toggle alert rule active flag.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string" },
        id: { type: "string" },
        active: { type: "boolean" },
      },
      required: ["id", "active"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const user = requireUser(ctx, args);
      const { id, active } = z.object({ id: z.string(), active: z.boolean() }).parse(args);
      await setRuleActive(user.email, id, active);
      return { ok: true };
    },
  },
];
