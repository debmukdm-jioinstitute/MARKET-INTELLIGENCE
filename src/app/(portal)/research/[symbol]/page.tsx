"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { CandlestickChart } from "@/components/charts/candlestick-chart";
import { MarketDepthLadder } from "@/components/feeds/market-depth-ladder";
import { DataInfo } from "@/components/feeds/data-info";
import { KeyRatiosPanel } from "@/components/fundamentals/key-ratios-panel";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { ResearchIntelligencePanels } from "@/components/research/research-intelligence-panels";
import { SymbolSearch } from "@/components/research/symbol-search";
import { Badge } from "@/components/ui/badge";
import { MetricInfo } from "@/components/ui/metric-info";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { fmtChgPct, fmtInr, fmtNum } from "@/lib/format-india";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResearchSymbolPage() {
  const params = useParams();
  const symbol = decodeURIComponent(String(params.symbol ?? "")).toUpperCase();
  const [data, setData] = useState<ResearchDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [symbol]);

  const q = data?.upstoxQuote;
  const us = data?.usDetail;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Investment research"
        title={data ? `${data.symbol} · ${data.name}` : symbol}
        subtitle="Live intelligence from Upstox (India) with Yahoo / Massive / SEC fallbacks for US names."
      />
      <SymbolSearch initialQuery={symbol} variant="bar" className="max-w-3xl" />
      <p className="text-xs text-muted-foreground">
        <Link href="/research" className="text-primary hover:underline">← Research home</Link>
        {data?.fetchedAt ? ` · Updated ${new Date(data.fetchedAt).toLocaleString()}` : null}
      </p>

      {loading ? <p className="text-sm text-muted-foreground">Loading research…</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {data && q ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">India · NSE</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300">Upstox live</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Quote & depth" className="xl:col-span-2">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-3xl tabular-nums">{fmtInr(q.ltp)}</p>
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
                      "font-mono text-sm",
                      q.netChange >= 0 ? "text-emerald-400" : "text-rose-400",
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
              <MarketDepthLadder buy={q.depth.buy} sell={q.depth.sell} />
            </Panel>
            <Panel title="Session">
              <dl className="grid grid-cols-2 gap-2 font-mono text-xs">
                <Stat metricId="nav" k="Open" v={fmtInr(q.ohlc.open)} />
                <Stat metricId="nav" k="Prev close" v={fmtInr(q.ohlc.close)} />
                <Stat metricId="high52w" k="High" v={fmtInr(q.ohlc.high)} />
                <Stat metricId="low52w" k="Low" v={fmtInr(q.ohlc.low)} />
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

      {data?.intelligence ? (
        <ResearchIntelligencePanels
          corporateActions={data.intelligence.corporateActions}
          newsFeed={data.intelligence.newsFeed}
          newsSummary={data.intelligence.newsSummary}
          brokerResearch={data.intelligence.brokerResearch}
        />
      ) : null}

      {data?.sources.length ? (
        <Panel title="Data sources">
          <ul className="space-y-2 text-sm">
            {data.sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">— {s.usedFor}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs">
                  Open
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
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
            <Lines data={chart} keys={[{ key: "px", color: "#d4af37", name: data.symbol }]} />
          </div>
        </Panel>
        <Panel title="Snapshot">
          <dl className="space-y-3 font-mono text-sm">
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
