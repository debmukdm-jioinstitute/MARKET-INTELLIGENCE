"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { CandlestickChart } from "@/components/charts/candlestick-chart";
import { DataInfo } from "@/components/feeds/data-info";
import { KeyRatiosPanel } from "@/components/fundamentals/key-ratios-panel";
import { Panel } from "@/components/layout/page-header";
import { ResearchIntelligencePanels } from "@/components/research/research-intelligence-panels";
import { LiveSentimentPanel } from "@/components/reddit/live-sentiment-panel";
import { SecurityRiskPanel } from "@/components/research/security-risk-panel";
import { SymbolSearch } from "@/components/research/symbol-search";
import { ValuationPanel } from "@/components/research/valuation-panel";
import { ScannerFlagsPanel } from "@/components/research/scanner-flags-panel";
import { TrendPanel } from "@/components/research/trend-panel";
import { OptionsSnapshotPanel } from "@/components/research/options-snapshot-panel";
import { IpoPanel } from "@/components/research/ipo-panel";
import { BrokerCallsPanel } from "@/components/research/broker-calls-panel";
import { FilingsPanel } from "@/components/research/filings-panel";
import { OwnershipPanel } from "@/components/research/ownership-panel";
import { RatingAlertPulse, RatingsPanel } from "@/components/research/ratings-panel";
import { ConcallPanel } from "@/components/research/concall-panel";
import { RiskChecklistPanel } from "@/components/research/risk-checklist-panel";
import { BuzzSentimentSection } from "@/components/research/buzz-sentiment-section";
import { ResearchSectionNav, BackToTopButton, type NavSectionItem } from "@/components/research/research-section-nav";
import { Badge } from "@/components/ui/badge";
import { MetricInfo } from "@/components/ui/metric-info";
import { findIndiaInstrument } from "@/lib/feeds/india/instruments";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { fmtChgPct, fmtInr, fmtNum } from "@/lib/format-india";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function ResearchSymbolClient({
  symbol: symbolProp,
  initialData = null,
}: {
  symbol: string;
  initialData?: ResearchDetailPayload | null;
}) {
  const params = useParams();
  const symbol = symbolProp || decodeURIComponent(String(params.symbol ?? "")).toUpperCase();
  const [data, setData] = useState<ResearchDetailPayload | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData?.symbol === symbol) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/feeds/research/${encodeURIComponent(symbol)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setData(json as ResearchDetailPayload);
      } catch (e) {
        if (!cancelled) {
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
  }, [symbol, initialData]);

  const q = data?.upstoxQuote;
  const us = data?.usDetail;
  const isIndia = Boolean(q || (!us && symbol));
  const isFno = useMemo(() => Boolean(findIndiaInstrument(symbol)), [symbol]);

  // Dynamic Navigation anchors based on available sections (Handbook Page 3)
  const navSections: NavSectionItem[] = useMemo(() => {
    const list: NavSectionItem[] = [
      { id: "overview", label: "Overview" },
      { id: "valuation", label: "Valuation" },
      { id: "radar", label: "Radar" },
      { id: "trend", label: "Trend" },
    ];
    if (isIndia && isFno) {
      list.push({ id: "options", label: "Options" });
    }
    if (data?.fundamentals) {
      list.push({ id: "fundamentals", label: "Fundamentals" });
    }
    list.push({ id: "risk", label: "Risk & Events" });
    if (isIndia && symbol) {
      list.push({ id: "retail-sentiment", label: "Retail Sentiment" });
    }
    if (isIndia && symbol) {
      list.push({ id: "ownership", label: "Ownership" });
      list.push({ id: "ratings", label: "Credit Ratings" });
      list.push({ id: "concall", label: "Earnings Call" });
      list.push({ id: "what-could-go-wrong", label: "What Could Go Wrong" });
      list.push({ id: "buzz", label: "Buzz & Sentiment" });
      list.push({ id: "broker-calls", label: "Broker Calls" });
      list.push({ id: "filings", label: "Filings" });
    }
    if (data?.intelligence) {
      list.push({ id: "news", label: "News & Filings" });
    }
    if (isIndia) {
      list.push({ id: "ipo", label: "IPO History" });
    }
    if (data?.sources?.length) {
      list.push({ id: "sources", label: "Sources" });
    }
    return list;
  }, [data, isIndia, isFno, symbol]);

  return (
    <div className="portal-page pb-16">
      <SymbolSearch initialQuery={symbol} variant="bar" className="max-w-3xl" />

      {/* Action Header / Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/research" className="text-primary hover:underline">← Research home</Link>
          {data?.fetchedAt ? ` · Hub sync ${new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {isIndia && symbol ? <RatingAlertPulse symbol={symbol} /> : null}
          {symbol ? (
            <Link
              href={`/research/model/${encodeURIComponent(symbol)}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Build financial model →
            </Link>
          ) : null}
          {isIndia && isFno ? (
            <Link
              href={`/markets/derivatives?underlying=${encodeURIComponent(symbol)}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Options chain →
            </Link>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
          Loading comprehensive dossier for {symbol}…
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {/* Sticky Section Navigation Bar */}
      {data && !loading ? <ResearchSectionNav sections={navSections} /> : null}

      {/* SECTION 1: OVERVIEW & LIVE QUOTE */}
      {data ? (
        <section id="overview" className="scroll-mt-24 space-y-4">
          {q ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">India · NSE</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-600">Upstox Live Feed</Badge>
                {isFno ? <Badge variant="outline" className="border-blue-500 text-blue-600">F&O Eligible</Badge> : null}
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <Panel title="Live Quote" className="xl:col-span-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-3xl tabular-nums font-bold text-foreground">{fmtInr(q.ltp)}</p>
                        <MetricInfo
                          id={symbol.toLowerCase()}
                          name={`${data.name} (${symbol})`}
                          provider="Upstox / NSE Official Tick Stream"
                          sourceUrl={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`}
                          asOf={q.asOf}
                        />
                      </div>
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums mt-0.5",
                          q.netChange >= 0 ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {q.netChange >= 0 ? "+" : ""}
                        {fmtInr(q.netChange)} ({fmtChgPct(q.ohlc.close ? q.netChange / q.ohlc.close : 0)})
                      </p>
                    </div>
                    <DataInfo
                      source={{
                        provider: "Upstox",
                        url: "https://upstox.com/developer/api-documentation/get-full-market-quote/",
                        asOf: q.asOf,
                      }}
                      hubSyncedAt={data.fetchedAt}
                    />
                  </div>
                </Panel>

                <Panel title="Session Statistics">
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <Stat metricId="nav" k="Open" v={fmtInr(q.ohlc.open)} />
                    <Stat metricId="nav" k="Prev close" v={fmtInr(q.ohlc.close)} />
                    <Stat metricId="high52w" k="High" v={fmtInr(q.ohlc.high)} />
                    <Stat metricId="low52w" k="Low" v={fmtInr(q.ohlc.low)} />
                    <Stat metricId="turnover" k="Volume" v={q.volume.toLocaleString("en-IN")} />
                    <Stat metricId="vwap" k="VWAP" v={fmtInr(q.avgPrice)} />
                  </dl>
                </Panel>
              </div>
            </>
          ) : us ? (
            <UsResearchPanels data={data} />
          ) : null}
        </section>
      ) : null}

      {/* SECTION 2: VALUATION & INTRINSIC VALUE (Handbook Page 3 Order: Value right after Overview) */}
      {symbol ? (
        <section id="valuation" className="scroll-mt-24">
          <ValuationPanel
            symbol={symbol}
            livePrice={q?.ltp ?? us?.quote?.price ?? null}
            liveAsOf={q?.asOf ?? null}
            currency={q ? "INR" : "USD"}
            indiaListing={Boolean(q)}
          />
        </section>
      ) : null}

      {/* SECTION 3: SCANNER RADAR & ACTIVE TRIGGERS */}
      {symbol ? (
        <section id="radar" className="scroll-mt-24">
          <ScannerFlagsPanel symbol={symbol} />
        </section>
      ) : null}

      {/* SECTION 4: PRICE HISTORY & TREND (Candlestick Chart + Technical Trend Indicators) */}
      {data ? (
        <section id="trend" className="scroll-mt-24 space-y-4">
          {data.candles?.length > 1 ? (
            <Panel title="Price History (5Y Daily Candles · Upstox)">
              <CandlestickChart candles={data.candles} />
            </Panel>
          ) : null}
          {data.candles?.length ? (
            <TrendPanel candles={data.candles} symbol={symbol} />
          ) : null}
        </section>
      ) : null}

      {/* SECTION 5: OPTIONS POSITIONING (F&O-Eligible Names Only) */}
      {isIndia && isFno ? (
        <section id="options" className="scroll-mt-24">
          <OptionsSnapshotPanel symbol={symbol} />
        </section>
      ) : null}

      {/* SECTION 6: FUNDAMENTALS (Key Ratios vs Sector) */}
      {data?.fundamentals ? (
        <section id="fundamentals" className="scroll-mt-24">
          <Panel title="Fundamentals (Key Financial Ratios)">
            <KeyRatiosPanel snapshot={data.fundamentals} />
          </Panel>
        </section>
      ) : null}

      {/* SECTION 7: RISK & EVENTS (Moved below fundamentals per Handbook IA) */}
      {symbol ? (
        <section id="risk" className="scroll-mt-24">
          <Panel
            title="Risk & Upcoming Events"
            subtitle="Volatility, drawdown, historical beta, and expected sovereign/earnings events computed from historical trading series."
          >
            <SecurityRiskPanel symbol={symbol} />
          </Panel>
        </section>
      ) : null}

      {/* SECTION: REDDIT & RETAIL SENTIMENT ENGINE */}
      {isIndia && symbol ? (
        <section id="retail-sentiment" className="scroll-mt-24">
          <Panel
            title="Reddit Retail Sentiment Engine (Alternative Data)"
            subtitle="Real posts fetched live from r/IndianStreetBets, r/IndiaInvestments, r/IndianStockMarket and others — not a precomputed dataset."
          >
            <div className="pt-2">
              <LiveSentimentPanel symbol={symbol} />
            </div>
          </Panel>
        </section>
      ) : null}

      {/* SECTION 7b: BROKER CALLS + NSE FILINGS (collected by our own collectors; India equities only) */}
      {data && isIndia && symbol ? (
        <>
          <section id="ownership" className="scroll-mt-24">
            <OwnershipPanel symbol={symbol} />
          </section>
          <section id="ratings" className="scroll-mt-24">
            <RatingsPanel symbol={symbol} />
          </section>
          <section id="what-could-go-wrong" className="scroll-mt-24">
            <RiskChecklistPanel symbol={symbol} />
          </section>
          <section id="buzz" className="scroll-mt-24">
            <BuzzSentimentSection symbol={symbol} candles={(data.candles ?? []).map((c) => ({ ts: c.ts, close: c.close }))} />
          </section>
          <section id="concall" className="scroll-mt-24">
            <ConcallPanel symbol={symbol} />
          </section>
          <section id="broker-calls" className="scroll-mt-24">
            <BrokerCallsPanel symbol={symbol} />
          </section>
          <section id="filings" className="scroll-mt-24">
            <FilingsPanel symbol={symbol} />
          </section>
        </>
      ) : null}

      {/* SECTION 8: NEWS, DISCLOSURES & CORPORATE ACTIONS */}
      {data?.intelligence ? (
        <section id="news" className="scroll-mt-24">
          <ResearchIntelligencePanels
            corporateActions={data.intelligence.corporateActions}
            newsFeed={data.intelligence.newsFeed}
            newsSummary={data.intelligence.newsSummary}
            brokerResearch={data.intelligence.brokerResearch}
          />
        </section>
      ) : null}

      {/* SECTION 9: IPO & LISTING HISTORY (Conditional) */}
      {isIndia ? (
        <section id="ipo" className="scroll-mt-24">
          <IpoPanel symbol={symbol} currentPrice={q?.ltp ?? null} />
        </section>
      ) : null}

      {/* SECTION 10: DATA SOURCES & PROVENANCE */}
      {data?.sources?.length ? (
        <section id="sources" className="scroll-mt-24">
          <Panel title="Data Sources & Provenance">
            <ul className="space-y-2 text-sm">
              {data.sources.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{s.label}</span>
                  <span className="text-muted-foreground">— {s.usedFor}</span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs hover:underline ml-auto"
                  >
                    Provider specification ↗
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      ) : null}

      {/* Back to top affordance */}
      <BackToTopButton />
    </div>
  );
}

function UsResearchPanels({ data }: { data: ResearchDetailPayload }) {
  const us = data.usDetail!;
  const chart = data.history.map((p) => ({ date: p.date, px: p.value }));
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">US Equity</Badge>
        <Badge variant="secondary">{us.quote.provider}</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Price History" className="xl:col-span-2">
          <div className="h-[280px]">
            <Lines data={chart} keys={[{ key: "px", color: "#1a73e8", name: data.symbol }]} />
          </div>
        </Panel>
        <Panel title="Snapshot">
          <dl className="space-y-3 text-sm">
            <Row metricId="nav" k="Last" v={`$${fmtNum(us.quote.price)}`} />
            <Row metricId="today_pnl" k="1D" v={formatPct(us.quote.changePct)} />
            {us.quote.pe != null ? <Row metricId="pe_ratio" k="P/E" v={us.quote.pe.toFixed(1)} /> : null}
            {us.quote.marketCap != null ? (
              <Row metricId="nav" k="Mkt cap" v={`$${(us.quote.marketCap / 1e9).toFixed(1)}B`} />
            ) : null}
          </dl>
        </Panel>
      </div>
      {us.secFilingsUrl ? (
        <Panel title="SEC Filings">
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
      <dt className="text-muted-foreground flex items-center gap-1 text-xs">
        <span>{k}</span>
        {metricId ? <MetricInfo id={metricId} name={k} iconSize="xs" /> : null}
      </dt>
      <dd className="font-semibold text-foreground mt-0.5">{v}</dd>
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
      <dd className="font-medium text-foreground">{v}</dd>
    </div>
  );
}
