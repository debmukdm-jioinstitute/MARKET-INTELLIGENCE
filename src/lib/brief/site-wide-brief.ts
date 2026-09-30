import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { mapResearchRow, type ApiResearchReport } from "@/lib/research/api-map";
import { getWatchlistLiveSentiment } from "@/lib/reddit-sentiment/live-cache";
import { buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import { buildLegalRiskHub } from "@/lib/legal-risk/build-hub";
import { fetchUpstoxIpoList } from "@/lib/feeds/sources/upstox";
import { enrichIpoListWithGmp } from "@/lib/feeds/ipo/enrich-gmp";
import { fetchRbiNews } from "@/lib/feeds/sources/rbi";
import { fetchNseNews } from "@/lib/feeds/sources/nse";
import { fetchBseNews } from "@/lib/feeds/sources/bse";
import { fetchNseOptionChain } from "@/lib/feeds/india/nse-market";
import { sortNewsByFreshness } from "@/lib/feeds/news-sort";

export interface IntelligencePillarSneakPeek {
  id: string;
  title: string;
  category: string;
  badge: string;
  badgeColor: string; // emerald, blue, violet, amber, rose
  headline: string;
  summary: string;
  metrics: {
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  }[];
  featuredEntities: {
    symbol?: string;
    name: string;
    keyFact: string;
    sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "BULLISH" | "BEARISH";
  }[];
  deepDiveUrl: string;
  deepDiveLabel: string;
}

export interface SiteWideExecutiveBrief {
  briefId: string;
  generatedAt: string;
  displayDate: string;
  marketSession: "PRE_MARKET" | "LIVE_SESSION" | "POST_CLOSE";
  stance: "Bullish" | "Defensive" | "Neutral";
  stanceScore: number; // 0 to 100
  executiveHeadline: string;
  executiveSummary: string;
  macroPulse: {
    nifty: { val: string; chg: string; up: boolean };
    sensex: { val: string; chg: string; up: boolean };
    indiaVix: { val: string; chg: string; elevated: boolean };
    fiiNetCr: { val: string; netInflow: boolean };
    diiNetCr: { val: string; netInflow: boolean };
    brentCrude: { val: string; chg: string };
    gsec10Y: { val: string };
    usdinr: { val: string; chg: string };
    rbiLiquidity: { val: string; status: string };
  };
  keyThemes: {
    theme: string;
    stance: "Bullish" | "Defensive" | "Neutral";
    headline: string;
    bullets: string[];
    sourcePillar: string;
  }[];
  watchToday: string[];
  pillars: IntelligencePillarSneakPeek[];
  regulatorHeadlines: { title: string; source: string; link?: string; timeAgo: string }[];
}

function fmtChgPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtIndexVal(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCr(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}₹${Math.round(v).toLocaleString("en-IN")} Cr`;
}

function timeAgoFrom(iso: string | undefined): string {
  if (!iso) return "recently";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "recently";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "under an hour ago";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const REGULATOR_FALLBACK = [
  { title: "RBI: latest press releases and circulars", source: "Reserve Bank of India", link: "https://www.rbi.org.in/", timeAgo: "check source" },
  { title: "NSE: latest corporate announcements and circulars", source: "National Stock Exchange", link: "https://www.nseindia.com/", timeAgo: "check source" },
  { title: "SEBI: latest circulars and orders", source: "Securities and Exchange Board of India", link: "https://www.sebi.gov.in/", timeAgo: "check source" },
];

export async function buildSiteWideExecutiveBrief(): Promise<SiteWideExecutiveBrief> {

  // Real live data: India market pulse, legal/regulatory risk, IPO grey-market premiums, and
  // regulator headlines. Each is independently optional — a failure here degrades to an honest
  // "—" / empty state for that slice, never a fabricated number.
  const [dashboard, legalRisk, openIpos, rbiNews, nseNews, bseNews, niftyChain] = await Promise.all([
    buildIndiaDashboardQuick().catch(() => null),
    buildLegalRiskHub().catch(() => null),
    fetchUpstoxIpoList("open")
      .then((ipos) => enrichIpoListWithGmp(ipos, "open"))
      .catch(() => []),
    fetchRbiNews().catch(() => []),
    fetchNseNews().catch(() => []),
    fetchBseNews().catch(() => []),
    fetchNseOptionChain("NIFTY").catch(() => null),
  ]);
  const regulatorNews = sortNewsByFreshness([...rbiNews, ...nseNews, ...bseNews]);

  // 1. Broker research notes — REAL collected notes only (research_reports table).
  // Empty when nothing has been ingested; never synthesized.
  let brokerReports: ApiResearchReport[] = [];
  try {
    if (hasDatabase()) {
      await ensureSchema();
      const db = sql();
      const rows = await db`
        SELECT
          id, source, broker, title, url, pdf_url, symbol, recommendation,
          target_price, cmp, upside_pct, report_type, summary, published_at, scraped_at, extra
        FROM research_reports
        ORDER BY COALESCE(published_at, scraped_at) DESC
        LIMIT 20
      `;
      brokerReports = rows.map((r) => mapResearchRow(r as Record<string, unknown>));
    }
  } catch (e) {
    console.error("Brief: failed to load research notes", e);
  }

  // NOTE: promoter/insider, credit-rating, mutual-fund holdings, and concall-tone inputs were
  // removed — those modules served hardcoded data with no live feed. Their pillars below render
  // explicit "unavailable" states until real feeds are wired.

  // 2. Retail Reddit Highlights — real live search across a fixed watchlist, not a fabricated hub.
  const liveReddit = await getWatchlistLiveSentiment();
  const topRedditSurge = liveReddit[0];

  // Composite stance from real signals where available (index direction, VIX level, PCR, legal-risk
  // flags). 50 = neutral baseline. Fabricated inputs are excluded.
  let stanceScore = 50;
  if (dashboard) stanceScore += (dashboard.pulse.nifty.changePct ?? 0) >= 0 ? 8 : -8;
  if (dashboard) stanceScore += (dashboard.pulse.indiaVix.value ?? 20) < 15 ? 6 : (dashboard.pulse.indiaVix.value ?? 20) > 20 ? -6 : 0;
  if (niftyChain?.pcr != null) stanceScore += niftyChain.pcr > 1.1 ? 6 : niftyChain.pcr < 0.9 ? -6 : 0;
  if (legalRisk) stanceScore += legalRisk.corporateRiskMonitor.highImpactCount === 0 ? 5 : -8;
  stanceScore = Math.max(0, Math.min(100, Math.round(stanceScore)));
  const stance: SiteWideExecutiveBrief["stance"] = stanceScore >= 60 ? "Bullish" : stanceScore <= 40 ? "Defensive" : "Neutral";

  const now = new Date();
  const istDate = now.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const istTime = now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });

  const brokerNotesCount = brokerReports.length;
  const brokerFeatured = brokerReports.slice(0, 3).map((r) => ({
    symbol: r.symbol ?? undefined,
    name: r.broker ?? r.source,
    keyFact: r.recommendation
      ? `${r.recommendation}${r.target_price != null ? ` · Target ₹${Number(r.target_price).toLocaleString("en-IN")}` : ""} — ${r.title}`
      : r.title,
    sentiment: undefined as "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "BULLISH" | "BEARISH" | undefined,
  }));

  const pillars: IntelligencePillarSneakPeek[] = [
    {
      id: "broker-research",
      title: "Broker Research Notes",
      category: "Institutional Coverage",
      badge: brokerNotesCount > 0 ? `${brokerNotesCount} Notes Collected` : "No Notes Yet",
      badgeColor: brokerNotesCount > 0 ? "emerald" : "amber",
      headline: brokerNotesCount > 0
        ? `Latest research notes collected from public desk publications`
        : "No broker research notes have been collected yet",
      summary: brokerNotesCount > 0
        ? "Target prices and recommendations exactly as published by the desks. Only notes actually collected are shown — nothing is estimated or simulated."
        : "Broker research notes are collected from public publications of institutional desks. None have been ingested yet — check back later. We don't show sample or estimated notes.",
      metrics: [
        { label: "Notes Collected", value: `${brokerNotesCount}` },
        {
          label: "Desks Represented",
          value: `${new Set(brokerReports.map((r) => r.broker).filter(Boolean)).size}`,
        },
        {
          label: "With Target Price",
          value: `${brokerReports.filter((r) => r.target_price != null).length}`,
        },
      ],
      featuredEntities: brokerFeatured,
      deepDiveUrl: "/research",
      deepDiveLabel: "Open Research Notes Feed",
    },

    {
      id: "promoter-insider",
      title: "Promoter & Insider Activity Tracker",
      category: "Ownership & Control",
      badge: "Feed Not Connected",
      badgeColor: "amber",
      headline: "Promoter and insider disclosures aren't wired to a live source yet",
      summary: "SEBI PIT/SAST disclosures are published on NSE and BSE, whose feeds block automated access. Until a verified feed is built, we show nothing here rather than estimates. Verify filings directly on the exchange disclosure pages.",
      metrics: [
        { label: "Live Records", value: "0" },
        { label: "Status", value: "Unavailable" },
      ],
      featuredEntities: [],
      deepDiveUrl: "/intelligence/promoters",
      deepDiveLabel: "Open Promoter & Insider Tracker",
    },

    {
      id: "credit-risk",
      title: "Credit & Rating Agency Intelligence",
      category: "Solvency & Debt",
      badge: "Feed Not Connected",
      badgeColor: "amber",
      headline: "Rating-agency actions aren't wired to a live feed yet",
      summary: "CRISIL, ICRA, CARE and other agencies publish rating actions on their own portals; no free live feed exists yet. Until one is verified, we show nothing here rather than estimates. Check the agency press-release pages directly.",
      metrics: [
        { label: "Live Actions", value: "0" },
        { label: "Status", value: "Unavailable" },
      ],
      featuredEntities: [],
      deepDiveUrl: "/intelligence/credit",
      deepDiveLabel: "View Credit Actions & Rating Changes",
    },

    {
      id: "company-concall",
      title: "Company Disclosures & Concall Intelligence",
      category: "Corporate Filings",
      badge: "Feed Not Connected",
      badgeColor: "amber",
      headline: "Concall tone analysis isn't wired to verified transcripts yet",
      summary: "Earnings concall transcripts have no free live feed yet. Until verified transcripts are ingested, no tone scores are shown.",
      metrics: [
        { label: "Tone Sentiment Score", value: "—" },
        { label: "Status", value: "Unavailable" },
      ],
      featuredEntities: [],
      deepDiveUrl: "/intelligence/company",
      deepDiveLabel: "Explore Corporate Timelines & Concall Tone",
    },

    {
      id: "mutual-funds",
      title: "Mutual Fund Smart Money Accumulation",
      category: "Institutional Funds",
      badge: "Feed Not Connected",
      badgeColor: "amber",
      headline: "Fund portfolio disclosures aren't ingested yet",
      summary: "AMC monthly portfolio disclosures are the verified source for fund holdings and flows; no ingestion pipeline exists yet. Live NAVs per scheme are available on the funds page. Nothing is estimated in the meantime.",
      metrics: [
        { label: "Live Holdings Records", value: "0" },
        { label: "Status", value: "Unavailable" },
      ],
      featuredEntities: [],
      deepDiveUrl: "/funds",
      deepDiveLabel: "Open Mutual Funds",
    },

    {
      id: "retail-sentiment",
      title: "Retail & Alternative Sentiment (Reddit)",
      category: "Social Sentiment",
      badge: "Live Reddit check",
      badgeColor: "amber",
      headline: topRedditSurge
        ? `Reddit Retail Sentiment: ${topRedditSurge.symbol} leads with ${topRedditSurge.totalMentions7D} real mentions this week`
        : "Reddit Retail Sentiment: no significant live chatter on tracked names right now",
      summary: "Real-time search across tracked India subreddits for a fixed watchlist — not a full-market survey. Sentiment split is a keyword-based heuristic, not a trained classifier.",
      metrics: [
        { label: "Tracked Subreddits", value: "10 Communities" },
        {
          label: "Top Net Sentiment",
          value: topRedditSurge ? `${topRedditSurge.netSentimentScore >= 0 ? "+" : ""}${topRedditSurge.netSentimentScore}` : "—",
          isPositive: (topRedditSurge?.netSentimentScore ?? 0) >= 0,
        },
        { label: "Weekly Mentions (top name)", value: topRedditSurge ? String(topRedditSurge.totalMentions7D) : "0" },
        { label: "Watchlist Checked", value: `${liveReddit.length} names with activity` },
      ],
      featuredEntities:
        liveReddit.length > 0
          ? liveReddit.slice(0, 3).map((c) => ({
              symbol: c.symbol,
              name: c.companyName,
              keyFact: `${c.totalMentions7D} real Reddit posts this week · net sentiment ${c.netSentimentScore >= 0 ? "+" : ""}${c.netSentimentScore}`,
              sentiment: c.netSentimentScore > 15 ? ("BULLISH" as const) : c.netSentimentScore < -15 ? ("BEARISH" as const) : ("NEUTRAL" as const),
            }))
          : [
              {
                name: "No live chatter right now",
                keyFact: "Reddit search across the tracked watchlist found no recent posts (or the communities were unreachable) — check the live desk for the current state.",
                sentiment: "NEUTRAL" as const,
              },
            ],
      deepDiveUrl: "/intelligence/reddit",
      deepDiveLabel: "Open Retail Sentiment & Reddit Radar",
    },

    {
      id: "macro-liquidity",
      title: "Macro, Yields & RBI System Liquidity",
      category: "Macroeconomic Backdrop",
      badge: dashboard?.rbiLiquidity.systemLiquidity.value ? "Live RBI/NSE tape" : "Data unavailable",
      badgeColor: "emerald",
      headline: dashboard
        ? `Macro Tape: System Liquidity ${dashboard.rbiLiquidity.systemLiquidity.value ?? "—"}, 10Y Yield ${fmtIndexVal(dashboard.pulse.gsec10y.value, 2)}%`
        : "Macro tape temporarily unavailable",
      summary: "Live RBI system liquidity, 10Y G-Sec yield, and Brent crude — no fabricated inflation/deficit narrative, just the current tape.",
      metrics: [
        { label: "System Liquidity", value: dashboard?.rbiLiquidity.systemLiquidity.value ?? "—" },
        { label: "Liquidity, 7D Change", value: dashboard?.rbiLiquidity.systemLiquidity.change7d ?? "—" },
        { label: "10Y G-Sec Yield", value: dashboard ? `${fmtIndexVal(dashboard.pulse.gsec10y.value, 2)}%` : "—" },
        { label: "Brent Crude", value: dashboard?.pulse.brent.value != null ? `$${fmtIndexVal(dashboard.pulse.brent.value, 2)} / bbl` : "—" },
      ],
      featuredEntities: dashboard
        ? [
            {
              name: "10Y G-Sec Yield",
              keyFact: `${fmtIndexVal(dashboard.pulse.gsec10y.value, 2)}% (${fmtChgPct(dashboard.pulse.gsec10y.changePct != null ? dashboard.pulse.gsec10y.changePct * 100 : null)} today) — RBI/FRED`,
              sentiment: "NEUTRAL",
            },
            {
              name: "USD / INR",
              keyFact: `₹${fmtIndexVal(dashboard.pulse.usdInr.value, 2)} (${fmtChgPct(dashboard.pulse.usdInr.changePct != null ? dashboard.pulse.usdInr.changePct * 100 : null)} today)`,
              sentiment: (dashboard.pulse.usdInr.changePct ?? 0) < 0 ? "POSITIVE" : "NEUTRAL",
            },
            {
              name: "India VIX",
              keyFact: `${fmtIndexVal(dashboard.pulse.indiaVix.value, 2)} points (${fmtChgPct(dashboard.pulse.indiaVix.changePct != null ? dashboard.pulse.indiaVix.changePct * 100 : null)} today)`,
              sentiment: (dashboard.pulse.indiaVix.changePct ?? 0) <= 0 ? "POSITIVE" : "NEGATIVE",
            },
          ]
        : [{ name: "Macro tape unavailable right now", keyFact: "Live fetch failed — check /macro directly.", sentiment: "NEUTRAL" }],
      deepDiveUrl: "/macro",
      deepDiveLabel: "Explore Macro Dashboard & RBI Transmission",
    },

    {
      id: "options-derivatives",
      title: "Options Flow & F&O Derivative Regimes",
      category: "Derivatives Tape",
      badge: niftyChain?.pcr != null ? `PCR ${niftyChain.pcr.toFixed(2)}` : "Data unavailable",
      badgeColor: "violet",
      headline: niftyChain?.pcr != null
        ? `Derivatives Sentiment: NIFTY Put-Call Ratio at ${niftyChain.pcr.toFixed(2)}${niftyChain.maxPain != null ? `, Max Pain ${niftyChain.maxPain.toLocaleString("en-IN")}` : ""}`
        : "Options chain temporarily unavailable — NSE feed unreachable",
      summary: "Live NSE option-chain PCR and max pain for the current NIFTY expiry, computed from real open interest — not a fabricated regime call.",
      metrics: [
        { label: "NIFTY Index PCR", value: niftyChain?.pcr != null ? niftyChain.pcr.toFixed(2) : "—" },
        { label: "Max Pain Strike", value: niftyChain?.maxPain != null ? `${niftyChain.maxPain.toLocaleString("en-IN")} Points` : "—" },
        { label: "Top Put OI Strike", value: niftyChain?.topPutStrikes[0] ? `${niftyChain.topPutStrikes[0].strike.toLocaleString("en-IN")}` : "—" },
        { label: "Top Call OI Strike", value: niftyChain?.topCallStrikes[0] ? `${niftyChain.topCallStrikes[0].strike.toLocaleString("en-IN")}` : "—" },
      ],
      featuredEntities: niftyChain?.pcr != null
        ? [
            {
              symbol: "NIFTY",
              name: "Nifty 50 Index Options",
              keyFact: `PCR ${niftyChain.pcr.toFixed(2)}, total OI ${niftyChain.totalOi?.toLocaleString("en-IN") ?? "—"} — NSE option chain`,
              sentiment: niftyChain.pcr > 1.1 ? "BULLISH" : niftyChain.pcr < 0.9 ? "BEARISH" : "NEUTRAL",
            },
            ...(niftyChain.topPutStrikes[0]
              ? [{ name: `Top Put OI: ${niftyChain.topPutStrikes[0].strike}`, keyFact: `${niftyChain.topPutStrikes[0].oi.toLocaleString("en-IN")} contracts open interest`, sentiment: "POSITIVE" as const }]
              : []),
            ...(niftyChain.topCallStrikes[0]
              ? [{ name: `Top Call OI: ${niftyChain.topCallStrikes[0].strike}`, keyFact: `${niftyChain.topCallStrikes[0].oi.toLocaleString("en-IN")} contracts open interest`, sentiment: "NEUTRAL" as const }]
              : []),
          ]
        : [{ name: "NSE option chain unavailable right now", keyFact: "Live fetch failed — check /research/options-flow directly.", sentiment: "NEUTRAL" }],
      deepDiveUrl: "/research/options-flow",
      deepDiveLabel: "Analyze Real-Time Options Flow Flags",
    },

    {
      id: "ipo-pipeline",
      title: "Primary Market & IPO Pipeline",
      category: "Capital Issuance",
      badge: openIpos.length > 0 ? `${openIpos.length} open` : "No open issues",
      badgeColor: "blue",
      headline: openIpos.length > 0
        ? `Primary Market: ${openIpos.length} Issue${openIpos.length === 1 ? "" : "s"} Open, Live Grey-Market Premiums Tracked`
        : "Primary Market: No mainboard/SME issues open right now",
      summary: "Real open IPOs from the Upstox calendar with grey-market premium pulled live from Chittorgarh and IPO Watch — no invented subscription multiples.",
      metrics: [
        { label: "Open Issues", value: String(openIpos.length) },
        {
          label: "Average GMP",
          value: (() => {
            const withGmp = openIpos.filter((i) => i.gmpPct != null);
            if (!withGmp.length) return "—";
            const avg = withGmp.reduce((a, i) => a + (i.gmpPct ?? 0), 0) / withGmp.length;
            return `${avg >= 0 ? "+" : ""}${avg.toFixed(1)}%`;
          })(),
          isPositive: true,
        },
        { label: "Issues with Live GMP", value: `${openIpos.filter((i) => i.gmpPct != null).length} / ${openIpos.length || 0}` },
      ],
      featuredEntities: openIpos.length > 0
        ? openIpos.slice(0, 3).map((ipo) => ({
            name: ipo.name,
            keyFact: ipo.gmpPct != null
              ? `GMP ${ipo.gmpPct >= 0 ? "+" : ""}${ipo.gmpPct.toFixed(1)}% (₹${ipo.gmpInr ?? "—"}) · price band ₹${ipo.minPrice}-₹${ipo.maxPrice}`
              : `Price band ₹${ipo.minPrice}-₹${ipo.maxPrice} · bidding until ${ipo.biddingEndDate}`,
            sentiment: (ipo.gmpPct ?? 0) > 5 ? ("BULLISH" as const) : (ipo.gmpPct ?? 0) < -5 ? ("BEARISH" as const) : ("NEUTRAL" as const),
          }))
        : [{ name: "No open IPOs right now", keyFact: "Check /research/ipo for upcoming issues.", sentiment: "NEUTRAL" }],
      deepDiveUrl: "/research/ipo",
      deepDiveLabel: "Track Live IPO Pipeline & Grey Market Premiums",
    },

    {
      id: "legal-regulatory",
      title: "Legal, SEBI & Insolvency Risk Monitor",
      category: "Governance & Scrutiny",
      badge: legalRisk ? `${legalRisk.corporateRiskMonitor.activeCaseCount} active cases` : "Data unavailable",
      badgeColor: "emerald",
      headline: legalRisk?.corporateRiskMonitor.summary ?? "Legal risk monitor temporarily unavailable",
      summary: "Real corporate legal/regulatory cases classified from live NSE, BSE, RBI and publisher news — not a static compliance narrative.",
      metrics: [
        { label: "Active Cases (tracked feeds)", value: legalRisk ? String(legalRisk.corporateRiskMonitor.activeCaseCount) : "—" },
        { label: "High-Impact Flags", value: legalRisk ? String(legalRisk.corporateRiskMonitor.highImpactCount) : "—", isPositive: legalRisk ? legalRisk.corporateRiskMonitor.highImpactCount === 0 : undefined },
        { label: "Monitors Covered", value: legalRisk ? `${legalRisk.monitors.length} Regulators` : "—" },
        { label: "Systemic Risk Rating", value: legalRisk ? (legalRisk.corporateRiskMonitor.highImpactCount === 0 ? "Low / Contained" : "Elevated") : "—", isPositive: legalRisk ? legalRisk.corporateRiskMonitor.highImpactCount === 0 : undefined },
      ],
      featuredEntities: legalRisk && legalRisk.cases.length > 0
        ? legalRisk.cases.slice(0, 3).map((c) => ({
            symbol: c.company.symbol ?? undefined,
            name: c.company.name ?? c.legalCase,
            keyFact: `${c.legalCase} — ${c.regulator}: ${c.issue}`,
            sentiment: c.potentialImpact === "high" ? ("NEGATIVE" as const) : c.potentialImpact === "medium" ? ("NEUTRAL" as const) : ("POSITIVE" as const),
          }))
        : [{ name: "No tracked legal/regulatory cases right now", keyFact: "Real-time feed found nothing flagged — check /intelligence/legal-risk directly.", sentiment: "NEUTRAL" }],
      deepDiveUrl: "/intelligence/legal-risk",
      deepDiveLabel: "Inspect Legal Risk & NCLT Insolvency Radar",
    },
  ];

  return {
    briefId: `brief-${now.toISOString().slice(0, 10)}`,
    generatedAt: now.toISOString(),
    displayDate: `${istDate} · ${istTime} IST`,
    marketSession: "LIVE_SESSION",
    stance,
    stanceScore,
    executiveHeadline: dashboard
      ? `Market Tape: NIFTY ${fmtIndexVal(dashboard.pulse.nifty.value, 0)} (${fmtChgPct(dashboard.pulse.nifty.changePct != null ? dashboard.pulse.nifty.changePct * 100 : null)}), VIX ${fmtIndexVal(dashboard.pulse.indiaVix.value, 2)}`
      : "Market tape temporarily unavailable",
    executiveSummary: `${brokerNotesCount > 0 ? `${brokerNotesCount} broker research notes collected from public desk publications` : "No broker research notes collected yet"} provide the institutional backdrop. Promoter, credit-rating, and mutual-fund holdings feeds are not connected yet — those sections show unavailable rather than estimates. RBI system liquidity is ${dashboard?.rbiLiquidity.systemLiquidity.value ?? "unavailable right now"}, with the 10Y G-Sec at ${dashboard ? `${fmtIndexVal(dashboard.pulse.gsec10y.value, 2)}%` : "—"} and Brent at ${dashboard?.pulse.brent.value != null ? `$${fmtIndexVal(dashboard.pulse.brent.value, 2)}` : "—"}.`,
    macroPulse: dashboard
      ? {
          nifty: { val: fmtIndexVal(dashboard.pulse.nifty.value, 1), chg: fmtChgPct(dashboard.pulse.nifty.changePct != null ? dashboard.pulse.nifty.changePct * 100 : null), up: (dashboard.pulse.nifty.changePct ?? 0) >= 0 },
          sensex: { val: fmtIndexVal(dashboard.pulse.sensex.value, 1), chg: fmtChgPct(dashboard.pulse.sensex.changePct != null ? dashboard.pulse.sensex.changePct * 100 : null), up: (dashboard.pulse.sensex.changePct ?? 0) >= 0 },
          indiaVix: { val: fmtIndexVal(dashboard.pulse.indiaVix.value, 2), chg: fmtChgPct(dashboard.pulse.indiaVix.changePct != null ? dashboard.pulse.indiaVix.changePct * 100 : null), elevated: (dashboard.pulse.indiaVix.value ?? 0) >= 18 },
          fiiNetCr: { val: fmtCr(dashboard.moneyFlow.fii.today), netInflow: (dashboard.moneyFlow.fii.today ?? 0) >= 0 },
          diiNetCr: { val: fmtCr(dashboard.moneyFlow.dii.today), netInflow: (dashboard.moneyFlow.dii.today ?? 0) >= 0 },
          brentCrude: { val: dashboard.pulse.brent.value != null ? `$${fmtIndexVal(dashboard.pulse.brent.value, 2)}` : "—", chg: fmtChgPct(dashboard.pulse.brent.changePct != null ? dashboard.pulse.brent.changePct * 100 : null) },
          gsec10Y: { val: dashboard.pulse.gsec10y.value != null ? `${fmtIndexVal(dashboard.pulse.gsec10y.value, 2)}%` : "—" },
          usdinr: { val: dashboard.pulse.usdInr.value != null ? `₹${fmtIndexVal(dashboard.pulse.usdInr.value, 2)}` : "—", chg: fmtChgPct(dashboard.pulse.usdInr.changePct != null ? dashboard.pulse.usdInr.changePct * 100 : null) },
          rbiLiquidity: { val: dashboard.rbiLiquidity.systemLiquidity.value ?? "—", status: dashboard.rbiLiquidity.systemLiquidity.value ? (dashboard.rbiLiquidity.systemLiquidity.value.includes("surplus") || dashboard.rbiLiquidity.systemLiquidity.value.startsWith("−") || dashboard.rbiLiquidity.systemLiquidity.value.startsWith("-") ? "Surplus" : "Deficit") : "Unavailable" },
        }
      : {
          nifty: { val: "—", chg: "—", up: false },
          sensex: { val: "—", chg: "—", up: false },
          indiaVix: { val: "—", chg: "—", elevated: false },
          fiiNetCr: { val: "—", netInflow: false },
          diiNetCr: { val: "—", netInflow: false },
          brentCrude: { val: "—", chg: "—" },
          gsec10Y: { val: "—" },
          usdinr: { val: "—", chg: "—" },
          rbiLiquidity: { val: "—", status: "Unavailable" },
        },
    keyThemes: [
      {
        theme: "Broker Research Notes",
        stance: brokerNotesCount > 0 ? "Neutral" : "Neutral",
        headline: brokerNotesCount > 0
          ? `${brokerNotesCount} research notes collected from public desk publications`
          : "No broker research notes collected yet",
        bullets: brokerNotesCount > 0
          ? brokerReports.slice(0, 3).map(
              (r) => `${r.broker ?? r.source}${r.symbol ? ` on ${r.symbol}` : ""}: ${r.title}${r.recommendation ? ` (${r.recommendation})` : ""}.`
            )
          : [
              "Broker research notes are collected from public publications of institutional desks — none ingested yet.",
              "No target prices or ratings are estimated; only collected notes are shown.",
            ],
        sourcePillar: "Broker Research Hub",
      },
      {
        theme: "Smart Money & Insider Signals",
        stance: "Neutral",
        headline: "Promoter, credit, and fund-holdings feeds not connected yet",
        bullets: [
          "Promoter/insider disclosures, rating-agency actions, and AMC portfolio disclosures have no verified live feed — shown as unavailable, never estimated.",
          "Verify filings directly on NSE/BSE disclosure pages and agency press-release portals.",
        ],
        sourcePillar: "Promoter Tracker & MF X-Ray",
      },
      {
        theme: "Macro & System Liquidity",
        stance: "Neutral",
        headline: dashboard ? "Live RBI System Liquidity & G-Sec Tape" : "Macro tape unavailable",
        bullets: dashboard
          ? [
              `RBI system liquidity: ${dashboard.rbiLiquidity.systemLiquidity.value ?? "—"} (7D change: ${dashboard.rbiLiquidity.systemLiquidity.change7d ?? "—"}).`,
              `India 10-year G-Sec yield at ${fmtIndexVal(dashboard.pulse.gsec10y.value, 2)}%, USD/INR at ₹${fmtIndexVal(dashboard.pulse.usdInr.value, 2)}.`,
            ]
          : ["Live macro fetch failed this run — see /macro for the current tape."],
        sourcePillar: "Macro Transmission Hub",
      },
      {
        theme: "Credit & Solvency Radar",
        stance: "Neutral",
        headline: "Rating-agency feed not connected yet",
        bullets: [
          "No verified live feed for CRISIL/ICRA/CARE rating actions — shown as unavailable, never estimated.",
          legalRisk ? `${legalRisk.corporateRiskMonitor.highImpactCount} high-impact legal/regulatory flags active right now.` : "Legal risk feed unavailable this run.",
        ],
        sourcePillar: "Credit Risk Intelligence",
      },
    ],
    watchToday: [
      niftyChain?.maxPain != null
        ? `F&O open interest concentration around the ${niftyChain.maxPain.toLocaleString("en-IN")} max-pain strike.`
        : "F&O open interest concentration — options chain unavailable this run.",
      "Reliance Industries and Tata Motors institutional delivery volumes.",
      dashboard?.rbiLiquidity.systemLiquidity.value
        ? `RBI system liquidity trajectory (currently ${dashboard.rbiLiquidity.systemLiquidity.value}).`
        : "RBI overnight reverse repo absorption levels for system liquidity trajectory.",
      openIpos.length > 0 ? `Anchor book bidding on ${openIpos.length} open mainboard/SME IPO issue${openIpos.length === 1 ? "" : "s"}.` : "No open IPO issues to watch today.",
    ],
    pillars,
    regulatorHeadlines:
      regulatorNews.length > 0
        ? regulatorNews.slice(0, 6).map((n) => ({
            title: n.title,
            source: n.source === "rbi" ? "Reserve Bank of India" : n.source === "nse" ? "National Stock Exchange" : n.source === "bse" ? "Bombay Stock Exchange" : n.source,
            link: n.link,
            timeAgo: timeAgoFrom(n.publishedAt),
          }))
        : REGULATOR_FALLBACK,
  };
}
