import { currentCompetition,leaderboard } from "@/lib/competition/store";
import { DISCLAIMER } from "@/lib/competition/config";
import { buildSiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import { getAllRetailSentimentData } from "@/lib/reddit-sentiment/database";
import { getLiveCompanySentimentCached, getWatchlistLiveSentiment } from "@/lib/reddit-sentiment/live-cache";
import { z } from "zod";
import { hasDatabase } from "@/lib/db";
import { buildIndiaMacroHub } from "@/lib/macro/build-hub";
import { buildMacroTape } from "@/lib/macro/build-tape";
import { buildWorldIndices } from "@/lib/macro/build-world-indices";
import { buildIndiaDashboard } from "@/lib/feeds/india/build-dashboard";
import { getMarketShiftsCached } from "@/lib/feeds/what-changed/cache";
import { fetchLiveBreadth } from "@/lib/feeds/india/upstox-breadth";
import { INDIA_EQUITIES, OPTION_UNDERLYINGS } from "@/lib/feeds/india/instruments";
import { buildFeedHub } from "@/lib/feeds/hub";
import { getSourceHealth } from "@/lib/health/sources";
import { buildResearchDetail } from "@/lib/feeds/research-detail";
import { buildDrivers } from "@/lib/guide/drivers-service";
import { buildSecurityDetail } from "@/lib/feeds/security-detail";
import { buildSecurityRisk } from "@/lib/feeds/security-risk";
import { enrichIpoListWithGmp } from "@/lib/feeds/ipo/enrich-gmp";
import {
  buildIpoIntelligence,
  compactIpoIntelligenceForMcp,
} from "@/lib/feeds/ipo/build-intelligence";
import { resolveIpoDetail } from "@/lib/feeds/ipo/resolve-detail";
import { buildLegalRiskHub, compactLegalRiskForMcp } from "@/lib/legal-risk/build-hub";
import {
  buildInstitutionalIntelligence,
  compactInstitutionalForMcp,
} from "@/lib/institutional/build-hub";
import { buildSearchTrendHub, compactSearchTrendsForMcp } from "@/lib/search-trends/build-hub";
import type { SearchTrendCategory } from "@/lib/search-trends/types";
import type { OfferCategory } from "@/lib/feeds/offers/types";
import { fetchChittorgarhOfferReport } from "@/lib/feeds/sources/chittorgarh-report-api";
import { searchSymbols } from "@/lib/feeds/symbol-search";
import { searchHelpTopics } from "@/lib/help/help-search-index";
import { listPortalOfferings } from "@/lib/site-assistant/education";
import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import { buildEarningsCalendarPanel } from "@/lib/feeds/earnings/build-calendar";
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
import { ensureSchema, sql } from "@/lib/db";
import { buildAnalystCredibility } from "@/lib/research/analyst-credibility";
import { SCANNERS } from "@/lib/scanner/scanners";
import { loadBacktest, loadScan, loadSignals } from "@/lib/scanner/store";
import { backtestSymbol, STRATEGIES, type StrategyId } from "@/lib/trade-lab/backtest";
import { computeLab } from "@/lib/trade-lab/engine";
import { TIMEFRAMES, type Timeframe } from "@/lib/trade-lab/types";
import {
  worldMonitorExternalUrl,
  worldMonitorLaunchPath,
  WORLDMONITOR_UPSTREAM_REPO,
} from "@/lib/worldmonitor/public-url";
import type { Tool } from "./tools";
import { breadthInsight, flowInsight, marketStatus, vixInsight } from "@/lib/homedashboard/insights";

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


let quotesCache: { data: Record<string, unknown>; timestamp: number } | null = null;
let holidaysCache: { data: Record<string, unknown>; timestamp: number } | null = null;
const underlyingKey = (label: string) => OPTION_UNDERLYINGS.find((u) => u.label.toUpperCase() === label.toUpperCase());

export const SITE_TOOLS: Tool[] = [
  {
    name: "get_alpha_league_preview", title: "Alpha League public standings", category: "Research",
    description: "Public top-20 virtual portfolio competition standings. Educational only; no participant emails, holdings or trades.",
    inputSchema: empty,
    run: async () => {
      const competition = await currentCompetition();
      if (!competition) return { competition: null, rows: [], disclaimer: DISCLAIMER };
      const board = await leaderboard(competition);
      return { competition: { name: competition.name, status: competition.status }, rows: board.rows.slice(0,20), delayed: board.delayed, disclaimer: DISCLAIMER };
    },
  },
  {
    name: "get_home_market_insights",
    title: "Today's market pulse and smart money",
    category: "Markets",
    description: "Compact homepage read-through: IST session, breadth, VIX and FII/DII flow patterns from available observations. Regular weekday hours exclude exchange holidays. No personal portfolio or mission data.",
    inputSchema: empty,
    run: async () => {
      const data = await buildIndiaDashboard();
      return {
        asOf: data.fetchedAt,
        session: marketStatus(new Date()),
        breadth: { advances: data.pulse.breadth.advances, declines: data.pulse.breadth.declines, insight: breadthInsight(data.pulse.breadth.advances, data.pulse.breadth.declines) },
        vix: { value: data.pulse.indiaVix.value, insight: vixInsight(data.pulse.indiaVix.value) },
        flows: (["fii", "dii"] as const).map((key) => ({ category: key.toUpperCase(), netCr: data.moneyFlow[key].today, asOf: data.moneyFlow[key].source.asOf, insight: flowInsight(key === "fii" ? "FIIs" : "DIIs", data.moneyFlow[key].history, data.moneyFlow[key].today) })),
      };
    },
  },
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
    name: "get_what_changed",
    title: "What changed (institutional shifts)",
    category: "Markets",
    description: "Home 'What changed' panel: FII/DII, G-Sec, sector spreads, commodities — refreshed every 3 hours.",
    inputSchema: empty,
    run: async () => {
      const p = await getMarketShiftsCached(false);
      return {
        fetchedAt: p.fetchedAt,
        slot: p.slot,
        items: p.items.map((i) => ({
          num: i.num,
          headline: i.headline,
          tag: i.tag,
          summary: i.dataSummary,
        })),
      };
    },
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
    description: "Live quotes for the tracked India large-cap universe (price, change, volume). Cached 60s for low latency.",
    inputSchema: empty,
    run: async () => {
      if (quotesCache && Date.now() - quotesCache.timestamp < 60_000) {
        return quotesCache.data;
      }
      const quotes = await fetchUpstoxQuotes(INDIA_EQUITIES.map((i) => ({ instrumentKey: i.instrumentKey, symbol: i.symbol })));
      const res = { quotes, cachedAt: new Date().toISOString() };
      quotesCache = { data: res, timestamp: Date.now() };
      return res;
    },
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
    description: "NSE/BSE trading holidays, whether today is a holiday and the next one. Cached 6h.",
    inputSchema: empty,
    run: async () => {
      if (holidaysCache && Date.now() - holidaysCache.timestamp < 6 * 3600_000) {
        return holidaysCache.data;
      }
      const holidays = await fetchUpstoxMarketHolidays();
      const res = { holidays, todayHoliday: isMarketHolidayToday(holidays), nextHoliday: nextMarketHoliday(holidays), cachedAt: new Date().toISOString() };
      holidaysCache = { data: res, timestamp: Date.now() };
      return res;
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
  {
    name: "get_source_health",
    title: "Source health",
    category: "Macro",
    description:
      "Per-source health of every data feed and scheduled collector: last success, last error, consecutive failures, and honest status (healthy/degraded/failing/unknown). Use it to check whether a feed is down before trusting its data.",
    inputSchema: empty,
    run: () => getSourceHealth(),
  },
  {
    name: "get_market_data_brief",
    title: "Market data brief (all collectors)",
    category: "Macro",
    description:
      "Latest values from every scheduled collector series (RBI rates, FII/DII flows, fund NAVs, India macro, ECB/US macro, VIX, COT positioning, valuation), formatted as the twice-daily Telegram briefing. Stale or failing sources are labelled; series with no data are omitted, never invented.",
    inputSchema: empty,
    run: async () => {
      const { buildDataBrief } = await import("@/lib/alerts/telegram-data-brief");
      const brief = await buildDataBrief();
      return { messages: brief.messages, series: brief.series, stale: brief.stale };
    },
  },

  // ---- Company disclosures (free NSE IR feed behind /intelligence/company) ----
  {
    name: "get_company_disclosures",
    title: "Company disclosures (NSE filings)",
    category: "Research",
    description:
      "Latest exchange-published company disclosures (NSE corporate announcements): concall schedules/transcripts, board outcomes, investor updates. Shown exactly as filed with original PDF links; empty when the collector has no rows — never invented.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100, description: "Max filings to return (default 20)" } },
      required: [],
      additionalProperties: false,
    },
    run: async (a) => {
      const { latestDisclosures } = await import("@/lib/disclosures/store");
      const limit = typeof (a as { limit?: unknown }).limit === "number" ? (a as { limit: number }).limit : 20;
      const rows = await latestDisclosures(Math.min(Math.max(limit, 1), 100));
      return {
        count: rows.length,
        source: "NSE India corporate announcements (collected twice daily)",
        disclosures: rows.map((d) => ({
          company: d.companyName,
          symbol: d.symbol,
          category: d.category,
          headline: d.headline,
          announcedAt: d.announcedAt,
          pdf: d.pdfUrl,
        })),
      };
    },
  },

  // ---- Research ----
  {
    name: "get_research_pack",
    title: "Stock research pack (composite)",
    category: "Research",
    description:
      "One-call comprehensive stock dossier: quote, key stats, price history (6mo), fundamental ratios, and security risk (drawdown, vol, beta). Saves 4 round trips.",
    inputSchema: {
      type: "object",
      properties: { symbol: sym },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol } = SymbolArg.parse(a);
      const upper = symbol.toUpperCase();
      const matchedEquity = INDIA_EQUITIES.find((e) => e.symbol.toUpperCase() === upper);
      const isin = matchedEquity?.isin;

      const [research, priceHistory, securityRisk, keyRatios] = await Promise.all([
        buildResearchDetail(upper).catch(() => null),
        fetchYahooHistory(upper, "6mo").catch(() => []),
        buildSecurityRisk(upper).catch(() => null),
        isin ? fetchUpstoxKeyRatios(isin).catch(() => null) : Promise.resolve(null),
      ]);

      return {
        symbol: upper,
        name: matchedEquity?.name ?? upper,
        isin: isin ?? null,
        research: research ?? { status: "unavailable", reason: "Research detail not available" },
        priceHistory: { range: "6mo", pointsCount: priceHistory?.length ?? 0, points: priceHistory ?? [] },
        securityRisk: securityRisk ?? { status: "unavailable", reason: "Risk metrics not available" },
        keyRatios: keyRatios ?? { status: "unavailable", reason: isin ? "Key ratios not available" : "ISIN not found for fundamentals" },
      };
    },
  },
  {
    name: "get_stock_research",
    title: "Stock research detail",
    category: "Research",
    description: "Research detail for one stock: quote, price history summary, key stats and the site's research view.",
    inputSchema: { type: "object", properties: { symbol: sym }, required: ["symbol"], additionalProperties: false },
    run: async (a) => (await buildResearchDetail(SymbolArg.parse(a).symbol)) ?? { status: "unavailable", reason: "Unknown symbol or no data" },
  },
  {
    name: "get_stock_drivers",
    title: "What moves this stock",
    category: "Research",
    description: "Business-specific drivers for any NSE stock (regulators, government policy, commodities, competition) with the latest headlines on each. Example: PolicyBazaar returns IRDAI commission-cap news.",
    inputSchema: { type: "object", properties: { symbol: sym }, required: ["symbol"], additionalProperties: false },
    run: async (a) => {
      const p = await buildDrivers(SymbolArg.parse(a).symbol.toUpperCase());
      return { ...p, drivers: p.drivers.map((d) => ({ ...d, evidence: d.evidence.map((e) => ({ title: e.title, source: e.source, link: e.link, publishedAt: e.publishedAt })) })) };
    },
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
    name: "get_key_ratios",
    title: "Key ratios (fundamentals)",
    category: "Research",
    description: "Fundamental key ratios for an Indian stock by ISIN, e.g. INE002A01018.",
    inputSchema: { type: "object", properties: { isin: { type: "string", description: "ISIN, e.g. INE002A01018" } }, required: ["isin"], additionalProperties: false },
    run: async (a) => (await fetchUpstoxKeyRatios(z.object({ isin: z.string().regex(/^[A-Z0-9]{12}$/) }).parse(a).isin)) ?? { status: "unavailable", reason: "No fundamentals data" },
  },
  {
    name: "get_earnings_calendar",
    title: "Earnings calendar",
    category: "Research",
    description: "Upcoming earnings dates for Nifty 500 names (next 14 days, Yahoo calendar).",
    inputSchema: empty,
    run: async () => {
      const panel = await buildEarningsCalendarPanel();
      return {
        portalPath: "/research#earnings-calendar",
        asOf: panel.asOf,
        scanned: panel.scanned,
        items: panel.items.map((i) => ({
          symbol: i.symbol,
          company: i.company,
          date: i.date,
          period: i.period,
          isEstimate: i.isEstimate,
        })),
        source: panel.source,
      };
    },
  },
  {
    name: "get_primary_offers",
    title: "NCD · Rights · Buyback · OFS",
    category: "Research",
    description:
      "Chittorgarh primary-market calendars: ncd, rights, buyback, ofs, ncd-subscription (live sub).",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["ncd", "rights", "buyback", "ofs", "ncd-subscription"],
          description: "Default ncd",
        },
        year: { type: "number", description: "Calendar year, default current" },
      },
      additionalProperties: false,
    },
    run: async (a) => {
      const category = z
        .enum(["ncd", "rights", "buyback", "ofs", "ncd-subscription"])
        .default("ncd")
        .parse(a.category) as OfferCategory;
      const year =
        a.year != null ? z.number().int().min(2015).max(2100).parse(a.year) : new Date().getFullYear();
      const report = await fetchChittorgarhOfferReport(category, year);
      return {
        category: report.category,
        title: report.title,
        year: report.year,
        source: report.source,
        rows: report.rows.slice(0, 40).map((r) => ({
          name: r.name,
          statusHint: r.statusHint,
          detailUrl: r.detailUrl,
          ...r.fields,
        })),
      };
    },
  },
  {
    name: "get_ipos",
    title: "IPOs",
    category: "Research",
    description:
      "IPO list by status (open, upcoming, closed, listed), enriched with best-effort grey market premium (GMP) when available.",
    inputSchema: { type: "object", properties: { status: { type: "string", enum: ["open", "upcoming", "closed", "listed"], description: "Default open" } }, additionalProperties: false },
    run: async (a) => {
      const status = z.enum(["open", "upcoming", "closed", "listed"]).default("open").parse(a.status);
      const base = await fetchUpstoxIpoList(status);
      const ipos = await enrichIpoListWithGmp(base, status);
      return {
        status,
        ipos: ipos.map((ipo) => ({
          id: ipo.id,
          symbol: ipo.symbol,
          name: ipo.name,
          issueType: ipo.issueType,
          issueSize: ipo.issueSize,
          industry: ipo.industry,
          minPrice: ipo.minPrice,
          maxPrice: ipo.maxPrice,
          biddingStartDate: ipo.biddingStartDate,
          biddingEndDate: ipo.biddingEndDate,
          totalSubscription: ipo.totalSubscription,
          gmpInr: ipo.gmpInr ?? null,
          gmpPct: ipo.gmpPct ?? null,
          gmpProvider: ipo.gmpSource?.provider ?? null,
        })),
      };
    },
  },
  {
    name: "get_ipo_intelligence",
    title: "IPO intelligence dossier",
    category: "Research",
    description:
      "Structured IPO dossier for one issue: DRHP/RHP, issue size, fresh issue/OFS extract, risks, objects, GMP*, subscription, listing performance, source links.",
    inputSchema: {
      type: "object",
      properties: { ipoId: { type: "string", description: "Upstox IPO id from get_ipos" } },
      required: ["ipoId"],
      additionalProperties: false,
    },
    run: async (a) => {
      const ipoId = z.string().min(1).max(80).parse(a.ipoId);
      const detail = await resolveIpoDetail(ipoId);
      if (!detail) return { error: "IPO not found" };
      const intel = await buildIpoIntelligence(detail);
      return compactIpoIntelligenceForMcp(intel);
    },
  },
  {
    name: "get_retail_sentiment_engine",
    title: "Reddit retail sentiment engine",
    category: "Research",
    description:
      "Real-time Reddit search (r/IndianStreetBets, r/IndiaInvestments, r/IndianStockMarket, etc.) for one symbol — actual posts from the last 7 days, not fabricated per-company stats. Sentiment split is a keyword-based heuristic, not a trained classifier.",
    inputSchema: {
      type: "object",
      properties: { symbol: sym },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol } = SymbolArg.parse(a);
      const data = await getLiveCompanySentimentCached(symbol);
      return {
        symbol: data.symbol,
        companyName: data.companyName,
        fetchIssue: data.fetchIssue,
        noData: data.noData,
        totalMentions7D: data.totalMentions7D,
        positivePct: data.positivePct,
        negativePct: data.negativePct,
        neutralPct: data.neutralPct,
        netSentimentScore: data.netSentimentScore,
        communityDistribution: data.communityDistribution,
        topPosts: data.topPosts.slice(0, 5).map((p) => ({ title: p.title, subreddit: p.subreddit, url: p.url, score: p.score })),
      };
    },
  },
  {
    name: "get_reddit_investor_problems",
    title: "Reddit investor problems radar",
    category: "Research",
    description:
      "Known retail investor friction points (research, portfolio tracking, taxes, data discovery) this site addresses, plus real live Reddit buzz for a fixed watchlist. Friction-point copy is editorial, not derived from live stats — no growth %/euphoria score claims.",
    inputSchema: empty,
    run: async () => {
      const data = getAllRetailSentimentData();
      const liveBuzz = await getWatchlistLiveSentiment();
      return {
        trackedSubredditsCount: data.trackedSubreddits.length,
        liveBuzzingNow: liveBuzz.slice(0, 6).map((s) => ({
          symbol: s.symbol,
          companyName: s.companyName,
          totalMentions7D: s.totalMentions7D,
          netSentimentScore: s.netSentimentScore,
        })),
        investorProblems: data.investorProblems.map((p) => ({
          category: p.categoryLabel,
          headline: p.headline,
          problemDescription: p.problemDescription,
          conventionalBlindspot: p.conventionalDatasetBlindspot,
          sampleQuery: p.sampleCommunityQueries[0]?.queryTitle,
          solutionFeature: p.miSolutionFeature.featureTitle,
          solutionHref: p.miSolutionFeature.href,
        })),
      };
    },
  },
  {
    name: "get_credit_risk_intelligence",
    title: "Credit & debt risk intelligence",
    category: "Research",
    description:
      "Credit rating actions from CRISIL, ICRA, CARE and others. No verified live feed is connected yet — this tool reports unavailable rather than estimates.",
    inputSchema: empty,
    run: async () => {
      const { loadCreditFeedSnapshot } = await import("@/lib/credit/load-feed");
      const snap = await loadCreditFeedSnapshot();
      if (snap.dataStatus !== "AVAILABLE" || !snap.items.length) {
        return {
          dataStatus: "UNAVAILABLE",
          message: snap.message,
        };
      }
      return {
        dataStatus: "AVAILABLE",
        asOf: snap.asOf,
        collectorsUsed: snap.collectorsUsed,
        count: snap.items.length,
        recent: snap.items.slice(0, 15).map((i) => ({
          agency: i.agency,
          title: i.title,
          action: i.action,
          date: i.actionDate,
          url: i.sourceUrl,
        })),
      };
    },
  },
  {
    name: "get_promoter_activity_tracker",
    title: "Promoter & insider activity tracker",
    category: "Research",
    description:
      "Promoter buying/selling, pledges, insider transactions and bulk/block deals from RSS-indexed NSE/BSE disclosures.",
    inputSchema: empty,
    run: async () => {
      const { loadPromoterFeedSnapshot } = await import("@/lib/promoters/load-feed");
      const snap = await loadPromoterFeedSnapshot();
      if (snap.dataStatus !== "AVAILABLE" || !snap.items.length) {
        return { dataStatus: "UNAVAILABLE", message: snap.message };
      }
      return {
        dataStatus: "AVAILABLE",
        asOf: snap.asOf,
        collectorsUsed: snap.collectorsUsed,
        count: snap.items.length,
        recent: snap.items.slice(0, 15).map((i) => ({
          channel: i.channel,
          title: i.title,
          category: i.category,
          symbol: i.symbol,
          date: i.transactionDate,
          url: i.sourceUrl,
        })),
      };
    },
  },
  {
    name: "get_institutional_intelligence",
    title: "Institutional investor intelligence",
    category: "Macro",
    description:
      "FII/FPI and DII cash flows, mutual-fund smart-money score, ownership signals, and tracker coverage.",
    inputSchema: empty,
    run: async () => compactInstitutionalForMcp(await buildInstitutionalIntelligence()),
  },
  {
    name: "get_legal_risk_monitor",
    title: "Legal / insolvency risk monitor",
    category: "Research",
    description:
      "Corporate risk chains: company → legal case → regulator (NCLT, courts, SEBI, CCI, ED, RBI) → exposure → impact.",
    inputSchema: empty,
    run: async () => compactLegalRiskForMcp(await buildLegalRiskHub()),
  },
  {
    name: "get_search_trend_attention",
    title: "Search-trend Attention Index",
    category: "Research",
    description:
      "Google Trends search interest (India geo) → Attention Index for companies, IPOs, sectors, commodities, macro, policy, CEOs, products.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Optional filter: company | ipo | sector | commodity | economic_indicator | policy | ceo | product",
        },
        keyword: { type: "string", description: "Optional custom Trends query or label filter" },
      },
      additionalProperties: false,
    },
    run: async (a) => {
      const { category, keyword } = z
        .object({
          category: z
            .enum([
              "company",
              "ipo",
              "sector",
              "commodity",
              "economic_indicator",
              "policy",
              "ceo",
              "product",
            ])
            .optional(),
          keyword: z.string().max(120).optional(),
        })
        .parse(a);
      return compactSearchTrendsForMcp(
        await buildSearchTrendHub({ category: category as SearchTrendCategory | undefined, keyword }),
      );
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
  {
    name: "get_analyst_credibility",
    title: "Analyst credibility",
    category: "Research",
    description:
      "Broker/analyst comparison over the last N (default 100) recommendations: hit rate, basis, time horizon, and scored outcomes. Flattened for terminal use.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "1–100, default 100" } },
      additionalProperties: false,
    },
    run: async (a) => {
      const { limit } = z.object({ limit: z.number().int().min(1).max(100).default(100) }).parse(a);
      const data = await buildAnalystCredibility(limit);
      if (!data.dbConfigured) return { status: "unavailable", reason: "Database not configured" };
      return {
        brokers: data.brokers.slice(0, 25).map((b) => ({
          broker: b.broker,
          sampleSize: b.sampleSize,
          scored: b.scored,
          hitRatePct: b.hitRatePct,
          avgReturnPct: b.avgReturnPct,
          topBasis: b.topBasis,
          typicalHorizon: b.typicalHorizon,
          mix: { buy: b.buyCount, sell: b.sellCount, hold: b.holdCount },
        })),
        recent: data.recommendations.slice(0, 40).map((r) => ({
          broker: r.broker,
          rating: r.rating,
          symbol: r.symbol,
          targetPrice: r.targetPrice,
          basis: r.basis,
          horizon: r.horizon,
          hit: r.hit,
          returnPct: r.returnPct,
          title: r.title.slice(0, 120),
          published_at: r.published_at,
        })),
      };
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
      if (!u) return { status: "unavailable", reason: "Unknown underlying", known: OPTION_UNDERLYINGS.map((x) => x.label) };
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
      if (!u) return { status: "unavailable", reason: "Unknown underlying", known: OPTION_UNDERLYINGS.map((x) => x.label) };
      return (await fetchUpstoxOptionChain(u.key, u.label, expiry)) ?? { status: "unavailable", reason: "No option chain data" };
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
    description: "Scanner catalogue with match counts. Pass scanner=<id> for that scanner's matches (capped at 25 by default), or symbol=X to list every scanner flagging X.",
    inputSchema: {
      type: "object",
      properties: {
        scanner: { type: "string", description: "Scanner id (see catalogue)" },
        symbol: { type: "string", description: "Symbol to look up" },
        limit: { type: "number", description: "Max matches when scanner is specified (default 25, max 100)" },
      },
      additionalProperties: false,
    },
    run: async (a) => {
      const { scanner, symbol, limit } = z
        .object({
          scanner: z.string().max(60).optional(),
          symbol: z.string().max(20).optional(),
          limit: z.number().int().min(1).max(100).default(25),
        })
        .parse(a);
      const run = await loadScan().catch(() => null);
      const sy = symbol?.trim().toUpperCase();
      const rawMatches = scanner ? (run?.scanners[scanner] ?? []) : undefined;
      return {
        run: run && { asOf: run.asOf, lastBar: run.lastBar, universe: run.universe, scanned: run.scanned, failed: run.failed },
        scanners: SCANNERS.map((s) => ({ id: s.id, label: s.label, description: s.description, bias: s.bias, matches: run?.scanners[s.id]?.length ?? 0 })),
        symbolHits: sy ? SCANNERS.flatMap((s) => (run?.scanners[s.id] ?? []).filter((r) => r.symbol === sy).map((r) => ({ scanner: s.id, label: s.label, bias: s.bias, ...r }))) : undefined,
        results: rawMatches ? rawMatches.slice(0, limit) : undefined,
        totalMatches: rawMatches ? rawMatches.length : undefined,
        hasMore: rawMatches ? rawMatches.length > limit : undefined,
      };
    },
  },
  {
    name: "get_ai_signals",
    title: "AI signals",
    category: "Scanners",
    description:
      "Latest AI signals: walk-forward ensemble index models (all F&O indices in the run), validation metrics, and Nifty 500 BTST/STBT candidates.",
    inputSchema: empty,
    run: async () => ({ run: await loadSignals().catch(() => null) }),
  },
  {
    name: "get_scanner_backtest",
    title: "Scanner backtest",
    category: "Scanners",
    description: "Latest scanner backtest, flattened to one row per scanner x holding period (signals, win rate, avg/median return, edge vs benchmark, best/worst). Pass curves=true to also include the Rs 10K equity curves (large).",
    inputSchema: { type: "object", properties: { curves: { type: "boolean", description: "Include equity curves (very large). Default false" } }, additionalProperties: false },
    run: async (a) => {
      const curves = z.object({ curves: z.boolean().default(false) }).parse(a).curves;
      const run = (await loadBacktest().catch(() => null)) as unknown as Record<string, unknown> | null;
      if (!run) return { run: null };
      const scanners = (run.scanners ?? []) as { id: string; label: string; bias: string; equity?: unknown; horizons?: Record<string, unknown>[] }[];
      const summary = scanners.flatMap((s) =>
        (s.horizons ?? []).map((h) => ({ scanner: s.label, bias: s.bias, holdDays: h.days, signals: h.signals, winRatePct: h.winRate, avgRetPct: h.avgRet, medRetPct: h.medRet, edgePct: h.edge, benchPct: h.bench, best: h.best, worst: h.worst })),
      );
      const head = { asOf: run.asOf, from: run.from, to: run.to, sessions: run.sessions, symbols: run.symbols, method: run.method, summary };
      return curves ? { ...head, benchmarkEquity: run.benchmarkEquity, curves: scanners.map((s) => ({ scanner: s.label, equity: s.equity })) } : head;
    },
  },
  {
    name: "get_trade_lab",
    title: "Trade Lab (indicators & patterns)",
    category: "Scanners",
    description:
      "Technical read for one NSE/BSE instrument (NIFTY, BANKNIFTY, SENSEX, BANKEX, INDIAVIX or any NSE symbol): RSI, MACD, EMA/SMA, Bollinger, Stochastic, ADX, Supertrend, ATR, Ichimoku, PSAR, CCI, Aroon, MFI, OBV, VWAP with plain-English readings and rules, detected candlestick/chart patterns, support/resistance, aggregate verdict and reasons. Pass strategy=<breakout|trend|pullback|meanrev> to backtest a preset on 2y of daily bars instead. Rule-based maths on real candles, no AI.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "e.g. NIFTY, BANKNIFTY, RELIANCE" },
        timeframe: { type: "string", enum: TIMEFRAMES.map((t) => t.id), description: "Default 1d" },
        strategy: { type: "string", enum: STRATEGIES.map((s) => s.id), description: "Run a backtest instead of the indicator read" },
      },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol, timeframe, strategy } = z
        .object({
          symbol: z.string().min(1).max(24),
          timeframe: z.enum(TIMEFRAMES.map((t) => t.id) as [Timeframe, ...Timeframe[]]).default("1d"),
          strategy: z.enum(STRATEGIES.map((s) => s.id) as [StrategyId, ...StrategyId[]]).optional(),
        })
        .parse(a);
      if (strategy) return backtestSymbol(symbol, strategy);
      const r = await computeLab(symbol, timeframe);
      if ("error" in r) return r;
      const { candles: _c, indicators, ...rest } = r;
      return { ...rest, indicators: indicators.map(({ spark: _s, ...i }) => i) };
    },
  },

  {
    name: "get_world_monitor",
    title: "World Monitor (global dashboard)",
    category: "Research",
    description:
      "Link and status for the integrated World Monitor global intelligence dashboard (news, maps, CII, finance variant).",
    inputSchema: empty,
    run: async () => ({
      portalPath: "/intelligence/world-monitor",
      launchPath: worldMonitorLaunchPath(),
      externalUrl: worldMonitorExternalUrl(),
      upstream: WORLDMONITOR_UPSTREAM_REPO,
      note: "Portal page uses free RSS/Yahoo/FRED feeds; optional full map at externalUrl.",
    }),
  },
  {
    name: "get_world_monitor_global_feeds",
    title: "World Monitor global feeds (RSS + indices)",
    category: "Research",
    description: "Headlines and global indices from free open feeds on the World Monitor page.",
    inputSchema: empty,
    run: async () => {
      const { buildFreeGlobalFeeds } = await import("@/lib/worldmonitor/free-global-feeds");
      const payload = await buildFreeGlobalFeeds();
      return {
        fetchedAt: payload.fetchedAt,
        news: payload.news.slice(0, 15),
        indices: payload.indices.indices.slice(0, 12).map((i) => ({
          label: i.label,
          price: i.price,
          changePct: i.changePct,
        })),
        macro: payload.macro,
        sources: payload.sources,
      };
    },
  },

  {
    name: "get_security_detail",
    title: "Security detail (quote)",
    category: "Research",
    description: "Full quote panel for one symbol: price, OHLC, fundamentals snippet, sources, and recent history summary.",
    inputSchema: { type: "object", properties: { symbol: sym }, required: ["symbol"], additionalProperties: false },
    run: async (a) => {
      const symbol = SymbolArg.parse(a).symbol.toUpperCase();
      const detail = await buildSecurityDetail(symbol);
      return {
        ...detail,
        history: detail.history.slice(-30),
      };
    },
  },
  {
    name: "list_portal_pages",
    title: "Portal sitemap",
    category: "System",
    description: "All portal sections and pages (same map as Ask Deb / site assistant). Optional skillLevel for Start Here shortcuts.",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["Today", "Stocks", "Trade", "Macro & Flows", "Portfolio", "Data & Tools", "all"],
        },
        skillLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
      },
      additionalProperties: false,
    },
    run: async (a) => {
      const section = z
        .enum(["Today", "Stocks", "Trade", "Macro & Flows", "Portfolio", "Data & Tools", "all"])
        .default("all")
        .parse(a.section ?? "all");
      const skillLevel = z.enum(["beginner", "intermediate", "advanced"]).optional().parse(a.skillLevel);
      return listPortalOfferings(section, skillLevel);
    },
  },
  {
    name: "search_help",
    title: "Search help docs",
    category: "System",
    description: "Search site help for MCP setup, terminal, alerts, export, troubleshooting.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
    run: async (a) => {
      const query = z.object({ query: z.string().min(1).max(200) }).parse(a).query;
      return {
        topics: searchHelpTopics(query, 5).map((t) => ({ title: t.title, blurb: t.blurb, href: t.href })),
      };
    },
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
  {
    name: "get_stock_accumulation_radar",
    title: "Smart money accumulation radar",
    category: "Funds",
    description: "Which stocks are being accumulated across Indian mutual funds? No verified holdings feed is connected yet — this tool reports unavailable rather than estimates.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum stocks to return (default 10)" },
      },
      additionalProperties: false,
    },
    run: async () => {
      return {
        dataStatus: "UNAVAILABLE",
        message: "AMC monthly portfolio disclosures are not ingested yet. No accumulation data is estimated.",
      };
    },
  },
  {
    name: "get_mutual_fund_overlap",
    title: "Mutual fund overlap analyzer",
    category: "Funds",
    description: "Portfolio overlap between two mutual fund schemes. No verified holdings feed is connected yet — this tool reports unavailable rather than estimates.",
    inputSchema: {
      type: "object",
      properties: {
        fundIdA: { type: "string", description: "First fund ID" },
        fundIdB: { type: "string", description: "Second fund ID" },
      },
      required: ["fundIdA", "fundIdB"],
      additionalProperties: false,
    },
    run: async () => {
      return {
        dataStatus: "UNAVAILABLE",
        message: "AMC monthly portfolio disclosures are not ingested yet. Overlap cannot be computed.",
      };
    },
  },
  {
    name: "get_site_wide_brief",
    title: "Site-wide executive intelligence brief",
    category: "Intelligence",
    description: "Daily briefing over the live market tape: index moves, macro liquidity, derivatives positioning, broker research notes, Reddit sentiment, and key catalysts. Promoter, credit, fund-holdings, and concall sections report unavailable until their feeds are connected.",
    inputSchema: empty,
    run: async () => {
      return buildSiteWideExecutiveBrief();
    },
  },
];
