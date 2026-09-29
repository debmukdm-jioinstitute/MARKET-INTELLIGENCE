import {
  getCompanyConsensusIntelligence,
  getAllBrokerResearchReports,
  INSTITUTIONAL_BROKER_SOURCES,
} from "@/lib/broker-research/database";
import { getAllPromoterActivities } from "@/lib/promoters/database";
import { getAllCreditActivities } from "@/lib/credit/database";
import { getCompanyIntelligenceProfile } from "@/lib/company-intelligence/database";
import { getCompanyRetailSentiment, getAllRetailSentimentData } from "@/lib/reddit-sentiment/database";
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
import { buildResearchDetail } from "@/lib/feeds/research-detail";
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
import { buildAnalystCredibility } from "@/lib/research/analyst-credibility";
import { SCANNERS } from "@/lib/scanner/scanners";
import { loadBacktest, loadScan, loadSignals } from "@/lib/scanner/store";
import {
  worldMonitorExternalUrl,
  worldMonitorLaunchPath,
  WORLDMONITOR_UPSTREAM_REPO,
} from "@/lib/worldmonitor/public-url";
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


let quotesCache: { data: Record<string, unknown>; timestamp: number } | null = null;
let holidaysCache: { data: Record<string, unknown>; timestamp: number } | null = null;
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
    run: async (a) => (await fetchUpstoxKeyRatios(z.object({ isin: z.string().regex(/^[A-Z0-9]{12}$/) }).parse(a).isin)) ?? { status: "unavailable", reason: "No fundamentals data" },
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
      "Extract alternative retail sentiment from Reddit (r/IndianStreetBets, r/IndiaInvestments, r/IndianStockMarket) including mention growth %, positive/negative/neutral breakdown, topics, and bull/bear debates for any symbol.",
    inputSchema: {
      type: "object",
      properties: { symbol: sym },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol } = SymbolArg.parse(a);
      const data = getCompanyRetailSentiment(symbol);
      return {
        symbol: data.symbol,
        companyName: data.companyName,
        totalMentions7D: data.totalMentions7D,
        mentionChangePct7D: data.mentionChangePct7D,
        positivePct: data.positivePct,
        negativePct: data.negativePct,
        neutralPct: data.neutralPct,
        netSentimentScore: data.netSentimentScore,
        sentimentMomentum: data.sentimentMomentum,
        mostDiscussedTopics: data.mostDiscussedTopics,
        communityDistribution: data.communityDistribution,
        topRetailDebates: data.topRetailDebates,
      };
    },
  },
  {
    name: "get_reddit_investor_problems",
    title: "Reddit investor problems radar",
    category: "Research",
    description:
      "Surface unconventional retail investor friction points from Reddit discussions across research, portfolio tracking, taxes, and data discovery.",
    inputSchema: empty,
    run: async () => {
      const data = getAllRetailSentimentData();
      return {
        overallMarketSentiment: data.overallMarketSentiment,
        trackedSubredditsCount: data.trackedSubreddits.length,
        investorProblems: data.investorProblems.map((p) => ({
          category: p.categoryLabel,
          headline: p.headline,
          growthPct: p.monthlyMentionGrowthPct,
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
    name: "get_consensus_intelligence",
    title: "Broker consensus intelligence & why changed",
    category: "Research",
    description:
      "Synthesize institutional consensus across 11 brokers (Motilal Oswal, Kotak, ICICI Sec, JM Financial, etc.) for a ticker, including target price spread, upside %, ratings matrix, and AI Consensus Changed — Why? revision drivers.",
    inputSchema: {
      type: "object",
      properties: { symbol: sym },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol } = SymbolArg.parse(a);
      const data = getCompanyConsensusIntelligence(symbol);
      return {
        symbol: data.symbol,
        companyName: data.companyName,
        sector: data.sector,
        cmp: data.cmp,
        consensusTargetPrice: data.consensusTargetPrice,
        consensusUpsidePct: data.consensusUpsidePct,
        targetPriceHigh: data.targetPriceHigh,
        brokerHigh: data.brokerHigh,
        targetPriceLow: data.targetPriceLow,
        brokerLow: data.brokerLow,
        buyRatioPct: data.buyRatioPct,
        ratingsBreakdown: {
          buy: data.buyCount,
          accumulate: data.accumulateCount,
          hold: data.holdCount,
          sell: data.sellCount,
        },
        whyChanged: data.whyChanged,
        brokerMatrix: data.brokerMatrix.map((b) => ({
          broker: b.broker,
          analyst: b.analyst,
          rating: b.rating,
          targetPrice: b.targetPrice,
          previousTarget: b.previousTarget,
          targetChangePct: b.targetChangePct,
          thesis: b.thesis,
          catalysts: b.catalysts,
          keyRisks: b.keyRisks,
          date: b.displayDate,
        })),
      };
    },
  },
  {
    name: "get_broker_research_feed",
    title: "Institutional broker research aggregator",
    category: "Research",
    description:
      "Aggregated feed of equity research notes, quarterly estimates, and ratings from 11 leading Indian institutional desks.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Optional ticker filter, e.g. RELIANCE, TATAMOTORS" },
        broker: { type: "string", description: "Optional broker filter, e.g. Motilal Oswal, Kotak Securities" },
      },
      additionalProperties: false,
    },
    run: async (a) => {
      const symbol = typeof a.symbol === "string" && a.symbol.trim() ? a.symbol.trim().toUpperCase() : undefined;
      const broker = typeof a.broker === "string" && a.broker.trim() ? a.broker.trim().toLowerCase() : undefined;
      let reports = getAllBrokerResearchReports();
      if (symbol) {
        reports = reports.filter((r) => r.symbol.toUpperCase() === symbol);
      }
      if (broker) {
        reports = reports.filter((r) => r.broker.toLowerCase().includes(broker));
      }
      return {
        totalReports: reports.length,
        monitoredDesksCount: INSTITUTIONAL_BROKER_SOURCES.length,
        reports: reports.slice(0, 30),
      };
    },
  },
{
    name: "get_company_intelligence_timeline",
    title: "Company disclosure timeline & delta",
    category: "Research",
    description:
      "Crawl official IR disclosures, timeline events (filings, presentations, credit actions, M&A, production), and AI-generated 'What changed?' delta for any listed Indian company.",
    inputSchema: {
      type: "object",
      properties: { symbol: sym },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol } = SymbolArg.parse(a);
      const profile = getCompanyIntelligenceProfile(symbol);
      return {
        symbol: profile.symbol,
        companyName: profile.companyName,
        sector: profile.sector,
        timelineCount: profile.timeline.length,
        recentTimeline: profile.timeline.slice(0, 10).map((t) => ({
          date: t.date,
          displayDate: t.displayDate,
          type: t.type,
          headline: t.headline,
          impact: t.impact,
          summary: t.summary,
        })),
        whatChangedDelta: {
          period: profile.whatChanged.period,
          netDirection: profile.whatChanged.netDirection,
          executiveSynthesis: profile.whatChanged.executiveSynthesis,
          dimensions: profile.whatChanged.dimensions,
          catalystsToWatch: profile.whatChanged.catalystsToWatch,
        },
      };
    },
  },
  {
    name: "get_concall_intelligence",
    title: "Concall intelligence & management tone tracker",
    category: "Research",
    description:
      "Extract earnings concall operational dimensions (management confidence score, revenue & margin guidance, capex, demand, pricing, analyst Q&A) and longitudinal Management Tone Tracker for any Indian company.",
    inputSchema: {
      type: "object",
      properties: { symbol: sym },
      required: ["symbol"],
      additionalProperties: false,
    },
    run: async (a) => {
      const { symbol } = SymbolArg.parse(a);
      const profile = getCompanyIntelligenceProfile(symbol);
      return {
        symbol: profile.symbol,
        companyName: profile.companyName,
        latestQuarter: profile.latestConcall.quarter,
        callDate: profile.latestConcall.date,
        managementConfidenceScore: profile.latestConcall.dimensions.managementConfidence.score,
        managementConfidenceStance: profile.latestConcall.dimensions.managementConfidence.stance,
        headlineVerdict: profile.latestConcall.headlineVerdict,
        dimensions: profile.latestConcall.dimensions,
        analystQA: profile.latestConcall.analystQA.map((q) => ({
          analyst: `${q.analystName} (${q.firm})`,
          question: q.question,
          speaker: q.managementSpeaker,
          answer: q.answerSummary,
          verbatimExcerpt: q.verbatimExcerpt,
          tone: q.tone,
        })),
        historicalToneTrajectory: profile.historicalToneTrajectory,
      };
    },
  },
  {
    name: "get_credit_risk_intelligence",
    title: "Credit & debt risk intelligence",
    category: "Research",
    description:
      "Monitor CRISIL, ICRA, CARE, India Ratings, Acuité, and Brickwork for upgrades, downgrades, credit watch, defaults, and liquidity concerns connected to equity prices.",
    inputSchema: empty,
    run: async () => {
      const all = getAllCreditActivities();
      return {
        totalActions: all.length,
        actions: all.slice(0, 15).map((a) => ({
          symbol: a.symbol,
          company: a.companyName,
          agency: a.agency,
          action: a.action,
          rating: `${a.ratingBefore} -> ${a.ratingAfter} (${a.outlookAfter})`,
          ratedDebtCr: a.ratedDebtAmountCr,
          liquidity: a.liquidityAssessment,
          equityReturnPct: a.equityConnection.equityReturnSinceActionPct,
          equityTransmission: a.equityConnection.transmission,
          date: a.actionDate,
        })),
      };
    },
  },
  {
    name: "get_promoter_activity_tracker",
    title: "Promoter & insider activity tracker",
    category: "Research",
    description:
      "Track promoter buying, selling, pledge increase/decrease, insider transactions, large shareholder changes, and bulk/block deals.",
    inputSchema: empty,
    run: async () => {
      const all = getAllPromoterActivities();
      return {
        totalTransactions: all.length,
        transactions: all.slice(0, 15).map((a) => ({
          symbol: a.symbol,
          company: a.companyName,
          category: a.category,
          person: a.personName,
          valueCr: a.transactionValueCr,
          stakeChangePct: a.stakePctChange,
          pledgePct: a.pledgePctOfPromoterHolding,
          riskImpact: a.riskImpact,
          date: a.transactionDate,
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
        earningsCount: payload.earnings.items.length,
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
          enum: ["Today", "Invest", "Trade", "My Portfolio", "Data & Tools", "all"],
        },
        skillLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
      },
      additionalProperties: false,
    },
    run: async (a) => {
      const section = z
        .enum(["Today", "Invest", "Trade", "My Portfolio", "Data & Tools", "all"])
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
];
