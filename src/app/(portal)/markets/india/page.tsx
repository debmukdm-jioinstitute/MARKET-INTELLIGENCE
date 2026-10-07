"use client";

import { SecuritySheet } from "@/components/india-markets/security-sheet";
import { MarketStatusBadge } from "@/components/feeds/market-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIndiaEquities } from "@/hooks/use-india-equities";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { useMarketStatus } from "@/hooks/use-market-status";
import { INDIA_EQUITIES, type IndiaInstrument } from "@/lib/feeds/india/instruments";
import { indexSlugFromLabel } from "@/lib/india-index-meta";
import { formatPct } from "@/lib/format";
import { fmtChgPts } from "@/lib/format-india";
import { cn } from "@/lib/utils";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

export default function IndiaMarketsPage() {
  const { quotes, loading, error } = useIndiaEquities();
  const { data: feedData } = useFeedHub(30_000);
  const { isOpen: nseOpen } = useMarketStatus();
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<IndiaInstrument | null>(null);
  const live = new Map(quotes.map((q) => [q.symbol, q]));
  const quoteLabel = nseOpen ? "Live" : "Last close";

  const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.03 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="portal-page">
      <PageHeader

        title="Indian markets"
        subtitle="NSE prices via Upstox — live during the session, last close when the market is shut. Tap a row for quote, depth, charts, and fundamentals."
        trust={{ source: "Upstox, NSE India", asOf: feedData?.fetchedAt, delayed: "Quotes may be delayed" }}
      />
      <MarketStatusBadge />

      {/* Benchmark Indices Grid */}
      {feedData?.indices?.length ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                INDIA BENCHMARKS (NSE / BSE)
                <span className="ml-2 font-semibold normal-case tracking-normal text-muted-foreground">
                  · {feedData.indices.length} indices
                </span>
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-sans">
              {quoteLabel} · <span className="text-[#1a73e8] font-semibold">tap a card for constituents</span>
            </span>
          </div>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[min(28rem,55vh)] overflow-y-auto pr-1"
            variants={gridVariants}
            initial="hidden"
            animate="show"
          >
            {feedData.indices.map((idx) => {
              const isPos = idx.changePct >= 0;
              const slug = indexSlugFromLabel(idx.symbol);
              const card = (
                <motion.div
                  variants={cardVariants}
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  className="group relative h-full rounded-lg border border-border/70 bg-card/40 p-3 space-y-1 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-foreground truncate" title={idx.name}>
                      {idx.symbol}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-bold",
                        isPos ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      )}
                    >
                      {fmtChgPts(idx.change)} ({formatPct(idx.changePct)})
                    </span>
                  </div>
                  <p className="text-base font-bold tabular-nums text-foreground">{idx.price.toFixed(2)}</p>
                  {slug ? (
                    <ArrowUpRight className="absolute right-2 bottom-2 size-4 text-[#1a73e8] opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : null}
                </motion.div>
              );
              return slug ? (
                <Link
                  key={idx.symbol}
                  href={`/markets/india/${slug}`}
                  aria-label={`${idx.symbol} — open index details and constituents`}
                  className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:ring-offset-2"
                >
                  {card}
                </Link>
              ) : (
                <div key={idx.symbol} className="rounded-lg">
                  {card}
                </div>
              );
            })}
          </motion.div>
        </div>
      ) : null}

      {loading && !quotes.length ? (
        <p className="text-sm text-muted-foreground">Connecting to Upstox…</p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="cv-table overflow-hidden rounded-lg border border-border bg-card">
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
                    {q ? (
                      <span
                        className={cn(
                          "ml-1 text-xs uppercase font-bold",
                          nseOpen ? "text-emerald-600" : "text-muted-foreground",
                        )}
                      >
                        {quoteLabel}
                      </span>
                    ) : null}
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
      <p className="mt-4 text-xs text-muted-foreground">
        Prices come from Upstox&apos;s exchange feed. When the market is closed, you see the last closing price.
      </p>

      <SecuritySheet
        instrument={selected}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
