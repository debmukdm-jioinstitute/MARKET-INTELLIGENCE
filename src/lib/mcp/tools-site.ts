import { z } from "zod";
import { hasDatabase } from "@/lib/db";
import { buildIndiaMacroHub } from "@/lib/macro/build-hub";
import { buildMacroTape } from "@/lib/macro/build-tape";
import { buildWorldIndices } from "@/lib/macro/build-world-indices";
import { buildIndiaDashboard } from "@/lib/feeds/india/build-dashboard";
import { fetchLiveBreadth } from "@/lib/feeds/india/upstox-breadth";
import { INDIA_EQUITIES, OPTION_UNDERLYINGS } from "@/lib/feeds/india/instruments";
import { buildFeedHub } from "@/lib/feeds/hub";
import { buildResearchDetail } from "@/lib/feeds/research-detail";
import { searchSymbols } from "@/lib/feeds/symbol-search";
import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import { fetchYahooEarningsDate } from "@/lib/feeds/sources/yahoo-calendar";
import {
  fetchUpstoxIpoList,
  fetchUpstoxKeyRatios,
  fetchUpstoxMarketHolidays,
  fetchUpstoxOptionChain,
  fetchUpstoxOptionExpiries,
  fetchUpstoxQuotes,
  isMarketHolidayToday,
  nextMarketHoliday,
} from "@/lib/feeds/sources/upstox";
import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { listOptionsFlowFlagLog } from "@/lib/options-flow/store";
import { applyOverrides, deriveAssumptions } from "@/lib/models/assumptions";
import { buildModel } from "@/lib/models/dcf-engine";
import { fetchFinancialDataset } from "@/lib/models/yahoo-fundamentals";
import { ensureSchema, sql } from "@/lib/db";
import { SCANNERS } from "@/lib/scanner/scanners";
import { loadBacktest, loadScan, loadSignals } from "@/lib/scanner/store";
import type { Tool } from "./tools";

/**
 * Read-only MCP tools that mirror the website's public data features (the terminal app `mi` builds its menu from
 * tools/list, so every tool added here shows up in the terminal automatically).
 *
 * `category` groups tools in the terminal menu. Anything user-specific (portfolio, alerts, admin) is deliberately
 * NOT exposed - an API key identifies a client, not a user account.
 */

const SymbolArg = z.object({ symbol: z.string().regex(/^[A-Za-z0-9.&^-]{1,20}$/) });
const sym = { type: "string", description: "Ticker, e.g. TCS, RELIANCE, AAPL" };
const empty = { type: "object", properties: {}, additionalProperties: false };

const underlyingKey = (label: string) => OPTION_UNDERLYINGS.find((u) => u.label.toUpperCase() === label.toUpperCase());

export const SITE_TOOLS: Tool[] = [
  // ---- Markets ----
  {
    name: "get_india_dashboard",
    title: "India markets dashboard",
    category: "Markets",
    description: "The India markets home view: pulse, indices, movers, global radar and India-impact read-through.",
    inputSchema: empty,
    run: () => buildIndiaDashboard(),
  },
  {
    name: "get_market_breadth",
    title: "Market breadth",
    category: "Markets",
    description: "Live NSE breadth: advancers, decliners, unchanged and related breadth measures.",
    inputSchema: empty,
    run: () => fetchLiveBreadth(),
  },
  {
    name: "get_india_equity_quotes",
    title: "Large-cap quotes (live)",
    category: "Markets",
    description: "Live quotes for the tracked India large-cap universe (price, change, volume).",
    inputSchema: empty,
    run: async () => ({ quotes: await fetchUpstoxQuotes(INDIA_EQUITIES.map((i) => ({ instrumentKey: i.instrumentKey, symbol: i.symbol }))) }),
  },
  {
    name: "get_world_indices",
    title: "World indices",
    category: "Markets",
    description: "Major global equity indices with levels and 1-day changes.",
    inputSchema: empty,
    run: () => buildWorldIndices(),
  },
  {
    name: "get_market_holidays",
    title: "Exchange holidays",
    category: "Markets",
    description: "NSE/BSE trading holidays, whether today is a holiday and the next one.",
    inputSchema: empty,
    run: async () => {
      const holidays = await fetchUpstoxMarketHolidays();
      return { holidays, todayHoliday: isMarketHolidayToday(holidays), nextHoliday: nextMarketHoliday(holidays) };
    },
  },
  {
    name: "search_symbols",
    title: "Search symbols",
    category: "Markets",
    description: "Search India and US tickers by name or symbol.",
    inputSchema: { type: "object", properties: { q: { type: "string", description: "Search text, e.g. reliance" } }, required: ["q"], additionalProperties: false },
    run: async (a) => ({ hits: await searchSymbols(z.object({ q: z.string().min(1).max(60) }).parse(a).q, 20) }),
  },

  // ---- Macro ----
  {
    name: "get_macro_tape",
    title: "Macro tape",
    category: "Macro",
    description: "Cross-asset macro tape: currencies, commodities, yields and rates with the transmission read-through into Indian sectors.",
    inputSchema: empty,
    run: () => buildMacroTape(),
  },
  {
    name: "get_india_macro_hub",
    title: "India macro hub",
    category: "Macro",
    description: "India macro hub: policy, inflation, growth, external and market indicators as shown on the site.",
    inputSchema: empty,
    run: () => buildIndiaMacroHub(),
  },
  {
    name: "get_feed_hub",
    title: "Feed hub",
    category: "Macro",
    description: "Aggregated feed hub used by the site's data pages.",
    inputSchema: empty,
    run: () => buildFeedHub(),
  },

  // ---- Research ----
  {
    name: "get_stock_research",
    title: "Stock research detail",
    category: "Research",
    description: "Research detail for one stock: quote, price history summary, key stats and the site's research view.",
    inputSchema: { type: "object", properties: { symbol: sym }, required: ["symbol"], additionalProperties: false },
    run: async (a) => (await buildResearchDetail(SymbolArg.parse(a).symbol)) ?? { error: "Unknown symbol" },
  },
  {
    name: "get_price_history",
    title: "Price history",
    category: "Research",
    description: "Daily price history for a symbol. range: 1mo, 3mo, 6mo, 1y.",
    inputSchema: {
      type: "object",
      properties: { symbol: sym, range: { type: "string", enum: ["1mo", "3mo", "6mo", "1y"], description: "Default 6mo" } },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol, range } = z.object({ symbol: SymbolArg.shape.symbol, range: z.enum(["1mo", "3mo", "6mo", "1y"]).default("6mo") }).parse(a);
      return { symbol: symbol.toUpperCase(), range, points: await fetchYahooHistory(symbol.toUpperCase(), range) };
    },
  },
  {
    name: "get_valuation_model",
    title: "DCF valuation model",
    category: "Research",
    description: "Auto-derived DCF / financial model for a symbol using the site's assumption engine. lookback = years of history used for assumptions (default 3).",
    inputSchema: {
      type: "object",
      properties: { symbol: sym, lookback: { type: "number", description: "Years, default 3" } },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol, lookback } = z.object({ symbol: SymbolArg.shape.symbol, lookback: z.number().int().min(1).max(10).default(3) }).parse(a);
      const dataset = await fetchFinancialDataset(symbol);
      return buildModel(dataset, applyOverrides(deriveAssumptions(dataset, 10, lookback), {}));
    },
  },
  {
    name: "get_key_ratios",
    title: "Key ratios (fundamentals)",
    category: "Research",
    description: "Fundamental key ratios for an Indian stock by ISIN, e.g. INE002A01018.",
    inputSchema: { type: "object", properties: { isin: { type: "string", description: "ISIN, e.g. INE002A01018" } }, required: ["isin"], additionalProperties: false },
    run: async (a) => (await fetchUpstoxKeyRatios(z.object({ isin: z.string().regex(/^[A-Z0-9]{12}$/) }).parse(a).isin)) ?? { error: "No fundamentals data" },
  },
  {
    name: "get_earnings_calendar",
    title: "Earnings calendar",
    category: "Research",
    description: "Next earnings date for each tracked India large cap (dates on file only).",
    inputSchema: empty,
    run: async () => {
      const results = await Promise.allSettled(INDIA_EQUITIES.map((i) => fetchYahooEarningsDate(i.symbol)));
      const rows: { symbol: string; name: string; date: string; isEstimate: boolean }[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) rows.push({ symbol: INDIA_EQUITIES[i].symbol, name: INDIA_EQUITIES[i].name, date: r.value.date, isEstimate: r.value.isEstimate });
      });
      return { rows: rows.sort((x, y) => x.date.localeCompare(y.date)), source: "Yahoo Finance calendar events" };
    },
  },
  {
    name: "get_ipos",
    title: "IPOs",
    category: "Research",
    description: "IPO list by status: open, upcoming, closed or listed.",
    inputSchema: { type: "object", properties: { status: { type: "string", enum: ["open", "upcoming", "closed", "listed"], description: "Default open" } }, additionalProperties: false },
    run: async (a) => {
      const status = z.enum(["open", "upcoming", "closed", "listed"]).default("open").parse(a.status);
      return { status, ipos: await fetchUpstoxIpoList(status) };
    },
  },
  {
    name: "get_research_reports",
    title: "Broker research reports",
    category: "Research",
    description: "Latest broker research reports scraped by the site. Filter by broker and/or text; limit up to 200 (default 30).",
    inputSchema: {
      type: "object",
      properties: { broker: { type: "string" }, q: { type: "string", description: "Title/broker text search" }, limit: { type: "number" } },
      additionalProperties: false,
    },
    run: async (a) => {
      if (!hasDatabase()) return { error: "Database not configured" };
      const { broker, q, limit } = z.object({ broker: z.string().max(60).optional(), q: z.string().max(80).optional(), limit: z.number().int().min(1).max(200).default(30) }).parse(a);
      await ensureSchema();
      const db = sql();
      const b = broker ?? null;
      const rows = q
        ? await db`SELECT id, source, broker, title, url, summary, published_at FROM research_reports
            WHERE (title ILIKE ${`%${q}%`} OR broker ILIKE ${`%${q}%`}) AND (${b}::text IS NULL OR broker ILIKE ${`%${b ?? ""}%`})
            ORDER BY COALESCE(published_at, scraped_at) DESC LIMIT ${limit}`
        : await db`SELECT id, source, broker, title, url, summary, published_at FROM research_reports
            WHERE ${b}::text IS NULL OR broker ILIKE ${`%${b ?? ""}%`}
            ORDER BY COALESCE(published_at, scraped_at) DESC LIMIT ${limit}`;
      return { reports: rows };
    },
  },

  // ---- Derivatives ----
  {
    name: "get_option_expiries",
    title: "Option expiries",
    category: "Derivatives",
    description: "Available option expiry dates for an underlying (NIFTY, BANKNIFTY, FINNIFTY or a tracked stock symbol).",
    inputSchema: { type: "object", properties: { underlying: { type: "string", description: "NIFTY, BANKNIFTY, FINNIFTY or stock symbol" } }, required: ["underlying"], additionalProperties: false },
    run: async (a) => {
      const u = underlyingKey(z.object({ underlying: z.string().max(20) }).parse(a).underlying);
      if (!u) return { error: "Unknown underlying", known: OPTION_UNDERLYINGS.map((x) => x.label) };
      return { underlying: u.label, expiries: await fetchUpstoxOptionExpiries(u.key) };
    },
  },
  {
    name: "get_option_chain",
    title: "Option chain",
    category: "Derivatives",
    description: "Option chain snapshot for an underlying and expiry (YYYY-MM-DD from get_option_expiries).",
    inputSchema: {
      type: "object",
      properties: { underlying: { type: "string", description: "NIFTY, BANKNIFTY, FINNIFTY or stock symbol" }, expiry: { type: "string", description: "YYYY-MM-DD" } },
      required: ["underlying", "expiry"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { underlying, expiry } = z.object({ underlying: z.string().max(20), expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(a);
      const u = underlyingKey(underlying);
      if (!u) return { error: "Unknown underlying", known: OPTION_UNDERLYINGS.map((x) => x.label) };
      return (await fetchUpstoxOptionChain(u.key, u.label, expiry)) ?? { error: "No option chain data" };
    },
  },
  {
    name: "get_options_flow",
    title: "Options-flow flags log",
    category: "Derivatives",
    description: "Recent options-flow flags logged by the site (unusual activity) plus the F&O-eligible stock universe size.",
    inputSchema: empty,
    run: async () => ({
      flags: hasDatabase() ? await listOptionsFlowFlagLog(60) : [],
      foUniverse: (await listFoUniverse()).map((i) => i.symbol),
    }),
  },

  // ---- Scanners & signals ----
  {
    name: "get_scanner",
    title: "Stock scanners",
    category: "Scanners",
    description: "Scanner catalogue with match counts. Pass scanner=<id> for that scanner's matches, or symbol=X to list every scanner flagging X.",
    inputSchema: {
      type: "object",
      properties: { scanner: { type: "string", description: "Scanner id (see catalogue)" }, symbol: { type: "string", description: "Symbol to look up" } },
      additionalProperties: false,
    },
    run: async (a) => {
      const { scanner, symbol } = z.object({ scanner: z.string().max(60).optional(), symbol: z.string().max(20).optional() }).parse(a);
      const run = await loadScan().catch(() => null);
      const sy = symbol?.trim().toUpperCase();
      return {
        run: run && { asOf: run.asOf, lastBar: run.lastBar, universe: run.universe, scanned: run.scanned, failed: run.failed },
        scanners: SCANNERS.map((s) => ({ id: s.id, label: s.label, description: s.description, bias: s.bias, matches: run?.scanners[s.id]?.length ?? 0 })),
        symbolHits: sy ? SCANNERS.flatMap((s) => (run?.scanners[s.id] ?? []).filter((r) => r.symbol === sy).map((r) => ({ scanner: s.id, label: s.label, bias: s.bias, ...r }))) : undefined,
        results: scanner ? (run?.scanners[scanner] ?? []) : undefined,
      };
    },
  },
  {
    name: "get_ai_signals",
    title: "AI signals",
    category: "Scanners",
    description: "Latest AI signals: Nifty model output with walk-forward validation and Nifty 500 BTST/STBT candidates.",
    inputSchema: empty,
    run: async () => ({ run: await loadSignals().catch(() => null) }),
  },
  {
    name: "get_scanner_backtest",
    title: "Scanner backtest",
    category: "Scanners",
    description: "Latest scanner backtest: stats per scanner and horizon plus equity curves.",
    inputSchema: empty,
    run: async () => ({ run: await loadBacktest().catch(() => null) }),
  },

  // ---- Updates ----
  {
    name: "get_latest_update",
    title: "Latest site update",
    category: "System",
    description: "The most recent published product update / announcement banner.",
    inputSchema: empty,
    run: async () => {
      if (!hasDatabase()) return { update: null };
      await ensureSchema();
      const rows = await sql()`SELECT id, title, body, severity, created_at FROM app_updates WHERE published = true ORDER BY created_at DESC LIMIT 1`;
      return { update: rows[0] ?? null };
    },
  },
];
