import { generateText } from "ai";
import { demoModeEnabled, demoLiveState, DEMO_NOTE } from "@/lib/ai-trader/demo-fixtures";
import { chainRowsFromSnapshot } from "@/lib/optionstrat/chain-from-snapshot";
import { optionContextForFnoIndex, pickExpiryForTheta } from "@/lib/optionstrat/fno-index-options";
import { recommendStrategies, type MarketBias, type RiskProfile } from "@/lib/optionstrat/strategy-recommender";
import { fetchUpstoxOptionChain, fetchUpstoxOptionExpiries } from "@/lib/feeds/sources/upstox/option-chain";
import { listRules, recentEvents } from "@/lib/alerts/store";
import { buildSnapshot, METRICS } from "@/lib/snapshot";
import { hasDatabase, ensureSchema, sql } from "@/lib/db";
import { CRONS, ENV_VARS, FLAGS } from "@/lib/admin/system";
import { loadPortfolioAnalysisForUser } from "@/lib/portfolio/load-for-user";
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
    name: "get_algo_desk_snapshot",
    title: "NIFTY Algo Desk snapshot",
    category: "Account",
    access: "user",
    description: "Live or demo algo desk state (equity, regime, open P&L summary). Full trading UI remains on /algo.",
    inputSchema: empty,
    run: async (_args, ctx) => {
      requireUser(ctx);
      if (demoModeEnabled()) {
        return { mode: "demo", note: DEMO_NOTE, state: demoLiveState() };
      }
      const upstream = (process.env.AI_TRADER_API_URL || "http://127.0.0.1:5050").replace(/\/$/, "");
      try {
        const res = await fetch(`${upstream}/api/state`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return { error: "Algo backend unreachable", status: res.status, hint: "Set AI_TRADER_API_URL or use demo mode." };
        return { mode: "live", state: await res.json() };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Algo backend unreachable" };
      }
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
      let flags = FLAGS.map((f) => ({ ...f, enabled: true }));
      try {
        const rows = (await d`SELECT flag, enabled FROM feature_flags`) as unknown as { flag: string; enabled: boolean }[];
        flags = FLAGS.map((f) => ({ ...f, enabled: rows.find((r) => r.flag === f.flag)?.enabled ?? true }));
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
];
