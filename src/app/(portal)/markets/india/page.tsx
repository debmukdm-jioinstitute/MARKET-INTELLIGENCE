"use client";

import { SecuritySheet } from "@/components/india-markets/security-sheet";
import { MarketStatusBadge } from "@/components/feeds/market-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIndiaEquities } from "@/hooks/use-india-equities";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { INDIA_EQUITIES, type IndiaInstrument } from "@/lib/feeds/india/instruments";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

export default function IndiaMarketsPage() {
  const { quotes, loading, error } = useIndiaEquities();
  const { data: feedData } = useFeedHub(30_000);
  const [selected, setSelected] = useState<IndiaInstrument | null>(null);
  const live = new Map(quotes.map((q) => [q.symbol, q]));

  return (
    <div className="portal-page">
      <PageHeader
        kicker="India"
        title="India markets"
        subtitle="NSE equities — live via Upstox (exchange-licensed). Click a row for full quote, depth, candles, and fundamentals."
      />
      <MarketStatusBadge />

      {/* Benchmark Indices Grid */}
      {feedData?.indices?.length ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                INDIA BENCHMARKS (NSE / BSE LIVE QUOTES)
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-sans">Live Quotes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {feedData.indices.map((idx) => {
              const isPos = idx.changePct >= 0;
              return (
                <div key={idx.symbol} className="rounded-lg border border-border/70 bg-card/40 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-foreground truncate">{idx.symbol}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-bold",
                        isPos ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      )}
                    >
                      {formatPct(idx.changePct)}
                    </span>
                  </div>
                  <p className="text-base font-bold tabular-nums text-foreground">{idx.price.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {loading && !quotes.length ? (
        <p className="text-sm text-muted-foreground">Connecting to Upstox…</p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Last
                  <MetricInfo id="nav" name="Last Traded Price" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Chg
                  <MetricInfo id="today_pnl" name="Point Change" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Chg %
                  <MetricInfo id="today_pnl" name="Percentage Return" iconSize="xs" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INDIA_EQUITIES.map((inst) => {
              const q = live.get(inst.symbol);
              return (
                <TableRow
                  key={inst.symbol}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => setSelected(inst)}
                >
                  <TableCell className="font-medium flex items-center gap-1">
                    <span>{inst.symbol}</span>
                    {q ? <span className="ml-1 text-xs uppercase text-emerald-600 font-bold">live</span> : null}
                    <MetricInfo
                      id={inst.symbol.toLowerCase()}
                      name={`${inst.name} (${inst.symbol})`}
                      provider="Upstox / NSE India Official Feed"
                      sourceUrl={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(inst.symbol)}`}
                      asOf={q?.asOf}
                      iconSize="xs"
                    />
                  </TableCell>
                  <TableCell>{inst.name}</TableCell>
                  <TableCell className="text-muted-foreground">{inst.sector}</TableCell>
                  <TableCell className="text-right font-medium">
                    {q ? q.price.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      (q?.change ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {q ? q.change.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-bold",
                      (q?.changePct ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {q ? formatPct(q.changePct) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <SecuritySheet
        instrument={selected}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
