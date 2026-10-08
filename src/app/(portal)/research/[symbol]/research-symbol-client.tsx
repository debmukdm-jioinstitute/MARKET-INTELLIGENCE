"use client";

import { DriverNudges } from "@/components/guide/driver-nudges";
import { DataInfo } from "@/components/feeds/data-info";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { StockSentimentPanel } from "@/components/hf-ai/stock-sentiment-panel";
import { SymbolSearch } from "@/components/research/symbol-search";
import { LeadershipPanel } from "@/components/research/leadership-panel";
import { InsightCardsPanel } from "@/components/research/insight-cards-panel";
import { ResearchSectionNav } from "@/components/research/research-section-nav";
import { StockPriceBento } from "@/components/price-bento/stock-price-bento";
import { LazyMount } from "@/components/research/lazy-mount";
import { Badge } from "@/components/ui/badge";
import { MetricInfo } from "@/components/ui/metric-info";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { fmtInr, fmtNum } from "@/lib/format-india";
import { formatPct } from "@/lib/format";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { awardXp } from "@/lib/gamification/client";
import { recordRecentSymbol } from "@/lib/research/recent-symbols";
import { CompanyLogo } from "@/components/CompanyLogo";

// Code-split heavy / below-the-fold UI so it is not parsed and hydrated during page load.
// Charts are client-only (canvas / SVG measured in the browser), so ssr:false loses nothing.
const chartBox = (h: number) =>
  function ChartSkeleton() {
    return <div className="w-full animate-pulse rounded-lg bg-muted/30" style={{ height: h }} />;
  };
const KeyRatiosPanel = dynamic(
  () => import("@/components/fundamentals/key-ratios-panel").then((m) => m.KeyRatiosPanel),
  { ssr: false, loading: chartBox(240) },
);
const FinancialsPanel = dynamic(() => import("@/components/research/financials-panel").then((m) => m.FinancialsPanel), {
  ssr: false,
  loading: chartBox(480),
});
const OwnershipPanel = dynamic(() => import("@/components/research/ownership-panel").then((m) => m.OwnershipPanel), {
  ssr: false,
  loading: chartBox(420),
});
const DocumentsPanel = dynamic(() => import("@/components/research/documents-panel").then((m) => m.DocumentsPanel), {
  ssr: false,
  loading: chartBox(360),
});
const RatingsPanel = dynamic(() => import("@/components/research/ratings-panel").then((m) => m.RatingsPanel), {
  ssr: false,
  loading: chartBox(240),
});
const ConcallPanel = dynamic(() => import("@/components/research/concall-panel").then((m) => m.ConcallPanel), {
  ssr: false,
  loading: chartBox(280),
});
const ResearchIntelligencePanels = dynamic(
  () => import("@/components/research/research-intelligence-panels").then((m) => m.ResearchIntelligencePanels),
  { ssr: false, loading: chartBox(400) },
);
const SecurityRiskPanel = dynamic(() => import("@/components/research/security-risk-panel").then((m) => m.SecurityRiskPanel), {
  ssr: false,
  loading: chartBox(280),
});
const SimilarStocksPanel = dynamic(() => import("@/components/hf-ai/similar-stocks-panel").then((m) => m.SimilarStocksPanel), {
  ssr: false,
  loading: chartBox(160),
});

/**
 * Session-level guard so a StrictMode double-mount (dev) doesn't fire the
 * award twice. The server enforces the daily cap anyway; this just avoids the
 * extra request.
 */
const deepResearchAwarded = new Set<string>();

const NAV_SECTIONS = [
  { id: "session-overview", label: "Overview & Price" },
  { id: "financial-statements", label: "Financials & Ratios" },
  { id: "shareholding", label: "Shareholding Pattern" },
  { id: "regulatory-documents", label: "Documents & Filings" },
  { id: "credit-ratings", label: "Credit Ratings" },
  { id: "concalls", label: "Earnings Concall" },
  { id: "risk-events", label: "Risk & Catalysts" },
];

/** Allowlist for hash deep-links: a raw location.hash is never passed to the DOM unvalidated. */
const SECTION_IDS = new Set(NAV_SECTIONS.map((s) => s.id));

export function ResearchSymbolClient({
  initialData,
  initialAgeMs,
  initialPanels,
}: {
  /** Last cached dossier (server-read from Redis), or null on a cache miss. */
  initialData: ResearchDetailPayload | null;
  initialAgeMs: number | null;
  /** SWR fallback map: exact panel URL -> cached JSON. */
  initialPanels: Record<string, unknown>;
}) {
  const params = useParams();
  const symbol = decodeURIComponent(String(params.symbol ?? "")).toUpperCase();
  const [data, setData] = useState<ResearchDetailPayload | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!symbol || deepResearchAwarded.has(symbol)) return;
    deepResearchAwarded.add(symbol);
    void awardXp("company_deep_research", symbol); // fire-and-forget, guests silently no-op
  }, [symbol]);

  // "Continue where you left off": remember this view for the recents strip.
  // Re-runs when the company name loads so the stored label is the real name.
  useEffect(() => {
    if (!symbol) return;
    recordRecentSymbol(symbol, data?.name);
  }, [symbol, data?.name]);

  // Hash deep-links (e.g. /research/RELIANCE#financials): scroll to the
  // matching section with the same header offset the section nav uses.
  // The hash is allowlisted against SECTION_IDS before touching the DOM.
  // Sections are lazy-mounted, so one delayed retry follows in case the
  // placeholder was replaced and heights shifted — unless the user scrolled.
  useEffect(() => {
    let settledY = -1;
    const scrollToSectionHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw) return;
      let id: string;
      try {
        id = decodeURIComponent(raw);
      } catch {
        return;
      }
      if (!SECTION_IDS.has(id)) return;
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.pageYOffset + (window.innerWidth < 1024 ? -160 : -80);
      if (settledY >= 0 && Math.abs(window.scrollY - settledY) > 8) return;
      settledY = y;
      window.scrollTo({ top: y, behavior: "smooth" });
    };
    const onHashChange = () => {
      settledY = -1;
      scrollToSectionHash();
    };
    scrollToSectionHash();
    const retry = window.setTimeout(scrollToSectionHash, 1200);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.clearTimeout(retry);
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    // Server already provided a fresh copy: skip the client fetch entirely.
    if (initialData && initialAgeMs !== null && initialAgeMs < 60_000) return;
    async function load() {
      // With a (stale) server copy on screen, refresh silently instead of showing "Loading".
      if (!initialData) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/feeds/research/${encodeURIComponent(symbol)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setData(json as ResearchDetailPayload);
      } catch (e) {
        if (!cancelled && !initialData) {
          setData(null);
          setError(e instanceof Error ? e.message : "Failed to load research");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (symbol) load();
    return () => {
      cancelled = true;
    };
    // initialData/initialAgeMs are fixed per mount (page passes key={symbol}).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const q = data?.upstoxQuote;
  const us = data?.usDetail;
  const isIndia = !us;
  // Upstox `ohlc.close` is the current session's running close (== LTP intraday), NOT the
  // previous close. Previous close = LTP − net change.
  const prevClose = q ? q.ltp - q.netChange : 0;
  // Sentiment input: merged Upstox + Google News feed (Upstox news alone is often empty).
  const sentimentHeadlines = (data?.intelligence?.newsFeed?.length ? data.intelligence.newsFeed : data?.news ?? [])
    .slice(0, 5)
    .map((n) => n.title)
    .filter(Boolean);

  return (
    <SWRConfig value={{ fallback: initialPanels }}>
    <div className="space-y-6 overflow-x-clip">
      <PageHeader
        title={data ? `${data.symbol} · ${data.name}` : symbol}
        leading={data && data.market === "IN" ? <CompanyLogo symbol={data.symbol} name={data.name} size={40} /> : undefined}
        subtitle="Live intelligence from Upstox & official NSE regulatory filings (XBRL), with Yahoo / SEC fallbacks for US names."
      />
      <SymbolSearch initialQuery={symbol} variant="bar" showShortcut={false} className="max-w-3xl" />

      {data ? <StockPriceBento data={data} /> : null}

      {/* Sticky section navigation */}
      {isIndia && !loading ? <ResearchSectionNav sections={NAV_SECTIONS} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/research" className="text-primary hover:underline font-medium">← Research home</Link>
          {data?.fetchedAt ? ` · Updated ${new Date(data.fetchedAt).toLocaleString()}` : null}
        </p>
      </div>

      {data ? <DriverNudges symbol={symbol} name={data.name} /> : null}

      {data?.about ? (
        <Panel title="About">
          <div className="flex gap-4">
            {data.about.thumbnail ? (
               
              <img src={data.about.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded object-contain" />
            ) : null}
            <div className="space-y-2 text-sm">
              {data.about.description ? (
                <p className="font-medium capitalize">{data.about.description}</p>
              ) : null}
              <p className="text-muted-foreground leading-relaxed">{data.about.extract}</p>
              {data.about.stale ? <p className="rounded-md bg-muted p-2.5 text-sm text-muted-foreground">This description comes from an older company filing, so it may use a former company name. Sentences quoting figures more than two years old have been left out.</p> : null}
              <a href={data.about.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                Source: {data.about.source}
              </a>
            </div>
          </div>
        </Panel>
      ) : null}

      {symbol ? <InsightCardsPanel symbol={symbol} /> : null}

      {isIndia && symbol ? <LeadershipPanel symbol={symbol} /> : null}

      {loading ? <p className="text-sm text-muted-foreground">Loading research…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {/* FinBERT AI News Sentiment for this stock */}
      {sentimentHeadlines.length ? (
        <StockSentimentPanel symbol={symbol} newsHeadlines={sentimentHeadlines} />
      ) : null}

      {data && q ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">India · NSE</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-600">Upstox live</Badge>
          </div>
          <div className="grid gap-4">
            <Panel id="session-overview" title="Session Overview">
              <div className="mb-2 flex justify-end">
                <DataInfo
                  source={{
                    provider: "Upstox",
                    url: "https://upstox.com/developer/api-documentation/get-full-market-quote/",
                    asOf: q.asOf,
                  }}
                  hubSyncedAt={data.fetchedAt}
                />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Stat k="Open" v={fmtInr(q.ohlc.open)} />
                <Stat k="Prev close" v={fmtInr(prevClose)} />
                <Stat k="Day high" v={fmtInr(q.ohlc.high)} />
                <Stat k="Day low" v={fmtInr(q.ohlc.low)} />
                <Stat metricId="turnover" k="Volume" v={q.volume.toLocaleString("en-IN")} />
                <Stat metricId="vwap" k="Avg" v={fmtInr(q.avgPrice)} />
              </dl>
            </Panel>
          </div>
          {data.fundamentals ? (
            <Panel title="Fundamentals (Upstox key ratios)">
              <KeyRatiosPanel snapshot={data.fundamentals} />
            </Panel>
          ) : null}
        </>
      ) : null}

      {data && !q && us ? (
        <UsResearchPanels data={data} />
      ) : null}

      {/* CORE EXTENSIONS REQUESTED: Financial Statements, Shareholding Donut, Documents, Ratings, Concalls */}
      {isIndia && symbol ? (
        <>
          {/* Below the fold: each panel mounts (JS + fetch + render) only when scrolled near. */}
          {/* 1. Full Financial Statements & Ratios (P&L, BS, CF, Quarterly Performance, Working Capital) */}
          <LazyMount anchorId="financial-statements" minHeight={480}>
            <FinancialsPanel symbol={symbol} />
          </LazyMount>

          {/* 2. Shareholding Pattern Donut Chart & Quarterly Trends & Risk Flags */}
          <LazyMount anchorId="shareholding" minHeight={420}>
            <OwnershipPanel symbol={symbol} />
          </LazyMount>

          {/* 3. Statutory Document Archive: Announcements, Annual Reports, Credit Ratings, Concalls */}
          <LazyMount anchorId="regulatory-documents" minHeight={360}>
            <DocumentsPanel symbol={symbol} />
          </LazyMount>

          {/* 4. Credit Ratings Agency Radar (CRISIL, CARE, ICRA) */}
          <LazyMount anchorId="credit-ratings" minHeight={240}>
            <RatingsPanel symbol={symbol} />
          </LazyMount>

          {/* 5. Earnings Conference Call Transcripts & Management Guidance */}
          <LazyMount anchorId="concalls" minHeight={280}>
            <ConcallPanel symbol={symbol} />
          </LazyMount>
        </>
      ) : null}

      {data?.intelligence ? (
        <LazyMount minHeight={400}>
          <ResearchIntelligencePanels
            corporateActions={data.intelligence.corporateActions}
            newsFeed={data.intelligence.newsFeed}
            newsSummary={data.intelligence.newsSummary}
            brokerResearch={data.intelligence.brokerResearch}
          />
        </LazyMount>
      ) : null}

      {symbol ? (
        <LazyMount anchorId="risk-events" minHeight={280}>
          <Panel id="risk-events" title="Risk & events" subtitle="Volatility, drawdown, beta and upcoming events computed from the last year of daily prices.">
            <SecurityRiskPanel symbol={symbol} />
          </Panel>
        </LazyMount>
      ) : null}

      {data?.sources.length ? (
        <Panel title="Data sources">
          <ul className="space-y-2 text-sm">
            {data.sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">— {s.usedFor}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">
                  Open
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Semantic similar companies — MiniLM-L6-v2 */}
      <LazyMount minHeight={160}>
        <SimilarStocksPanel symbol={symbol} />
      </LazyMount>
    </div>
    </SWRConfig>
  );
}

function UsResearchPanels({ data }: { data: ResearchDetailPayload }) {
  const us = data.usDetail!;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">US</Badge>
        <Badge variant="secondary">{us.quote.provider}</Badge>
      </div>
      <div className="grid gap-4">
        <Panel title="Snapshot">
          <dl className="space-y-3 text-sm">
            <Row metricId="nav" k="Last" v={fmtNum(us.quote.price)} />
            <Row metricId="today_pnl" k="1D" v={formatPct(us.quote.changePct)} />
            {us.quote.pe != null ? <Row metricId="pe_ratio" k="P/E" v={us.quote.pe.toFixed(1)} /> : null}
            {us.quote.marketCap != null ? (
              <Row metricId="nav" k="Mkt cap" v={`${(us.quote.marketCap / 1e9).toFixed(1)}B`} />
            ) : null}
          </dl>
        </Panel>
      </div>
      {us.secFilingsUrl ? (
        <Panel title="SEC filings">
          <a href={us.secFilingsUrl} className="text-sm text-primary hover:underline" target="_blank" rel="noreferrer">
            View EDGAR filings →
          </a>
        </Panel>
      ) : null}
    </>
  );
}

function Stat({ metricId, k, v }: { metricId?: string; k: string; v: string }) {
  return (
    <div>
      <dt className="text-muted-foreground flex items-center gap-1">
        <span>{k}</span>
        {metricId ? <MetricInfo id={metricId} name={k} iconSize="xs" /> : null}
      </dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Row({ metricId, k, v }: { metricId?: string; k: string; v: string }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-muted-foreground flex items-center gap-1">
        <span>{k}</span>
        {metricId ? <MetricInfo id={metricId} name={k} iconSize="xs" /> : null}
      </dt>
      <dd>{v}</dd>
    </div>
  );
}
