"use client";

import { CandlestickChart } from "@/components/charts/candlestick-chart";
import { Lines } from "@/components/charts/terminal-charts";
import { DriverNudges } from "@/components/guide/driver-nudges";
import { DataInfo } from "@/components/feeds/data-info";
import { KeyRatiosPanel } from "@/components/fundamentals/key-ratios-panel";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { ResearchIntelligencePanels } from "@/components/research/research-intelligence-panels";
import { SecurityRiskPanel } from "@/components/research/security-risk-panel";
import { SimilarStocksPanel } from "@/components/hf-ai/similar-stocks-panel";
import { StockSentimentPanel } from "@/components/hf-ai/stock-sentiment-panel";
import { SymbolSearch } from "@/components/research/symbol-search";
import { FinancialsPanel } from "@/components/research/financials-panel";
import { OwnershipPanel } from "@/components/research/ownership-panel";
import { DocumentsPanel } from "@/components/research/documents-panel";
import { RatingsPanel } from "@/components/research/ratings-panel";
import { ConcallPanel } from "@/components/research/concall-panel";
import { LeadershipPanel } from "@/components/research/leadership-panel";
import { ResearchSectionNav } from "@/components/research/research-section-nav";
import { Badge } from "@/components/ui/badge";
import { MetricInfo } from "@/components/ui/metric-info";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { fmtChgPct, fmtInr, fmtNum } from "@/lib/format-india";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { awardXp } from "@/lib/gamification/client";

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
    <div className="space-y-6">
      <PageHeader
        title={data ? `${data.symbol} · ${data.name}` : symbol}
        subtitle="Live intelligence from Upstox & official NSE regulatory filings (XBRL), with Yahoo / SEC fallbacks for US names."
      />
      {q ? (
        <div className="-mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl tabular-nums font-bold tracking-tight">{fmtInr(q.ltp)}</span>
          <span className={cn("text-sm font-semibold", q.netChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {q.netChange >= 0 ? "+" : ""}
            {fmtInr(q.netChange)} ({fmtChgPct(prevClose ? q.netChange / prevClose : 0)})
          </span>
          <MetricInfo
            id={symbol.toLowerCase()}
            name={`${data!.name} (${symbol})`}
            provider="Upstox / NSE Official Tick Stream"
            sourceUrl={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`}
            asOf={q.asOf}
          />
        </div>
      ) : null}

      <SymbolSearch initialQuery={symbol} variant="bar" className="max-w-3xl" />

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
              <a href={data.about.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                Source: {data.about.source}
              </a>
            </div>
          </div>
        </Panel>
      ) : null}

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
          {data.candles.length > 1 ? (
            <Panel title="Price history (1Y · Upstox daily)">
              <CandlestickChart candles={data.candles} />
            </Panel>
          ) : null}
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
          {/* 1. Full Financial Statements & Ratios (P&L, BS, CF, Quarterly Performance, Working Capital) */}
          <FinancialsPanel symbol={symbol} />

          {/* 2. Shareholding Pattern Donut Chart & Quarterly Trends & Risk Flags */}
          <OwnershipPanel symbol={symbol} />

          {/* 3. Statutory Document Archive: Announcements, Annual Reports, Credit Ratings, Concalls */}
          <DocumentsPanel symbol={symbol} />

          {/* 4. Credit Ratings Agency Radar (CRISIL, CARE, ICRA) */}
          <RatingsPanel symbol={symbol} />

          {/* 5. Earnings Conference Call Transcripts & Management Guidance */}
          <ConcallPanel symbol={symbol} />
        </>
      ) : null}

      {data?.intelligence ? (
        <ResearchIntelligencePanels
          corporateActions={data.intelligence.corporateActions}
          newsFeed={data.intelligence.newsFeed}
          newsSummary={data.intelligence.newsSummary}
          brokerResearch={data.intelligence.brokerResearch}
        />
      ) : null}

      {symbol ? (
        <Panel id="risk-events" title="Risk & events" subtitle="Volatility, drawdown, beta and upcoming events computed from the last year of daily prices.">
          <SecurityRiskPanel symbol={symbol} />
        </Panel>
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
      <SimilarStocksPanel symbol={symbol} />
    </div>
    </SWRConfig>
  );
}

function UsResearchPanels({ data }: { data: ResearchDetailPayload }) {
  const us = data.usDetail!;
  const chart = data.history.map((p) => ({ date: p.date, px: p.value }));
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">US</Badge>
        <Badge variant="secondary">{us.quote.provider}</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Price" className="xl:col-span-2">
          <div className="h-[280px]">
            <Lines data={chart} keys={[{ key: "px", color: "#1a73e8", name: data.symbol }]} />
          </div>
        </Panel>
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
