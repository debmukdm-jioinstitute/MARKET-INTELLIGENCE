"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatInr, formatPct } from "@/lib/format";
import type { SecurityDetailPayload } from "@/lib/feeds/security-detail";
import { cn } from "@/lib/utils";
import { DataInfo } from "@/components/feeds/data-info";
import Link from "next/link";
import { useEffect, useState } from "react";

export type PositionContext = {
  shares: number;
  avgCost: number;
  marketValue: number;
  weight: number;
  pnl: number;
  dayPct: number;
};

type Props = {
  symbol: string | null;
  position?: PositionContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SecurityDetailDialog({ symbol, position, open, onOpenChange }: Props) {
  const [data, setData] = useState<SecurityDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/feeds/security/${symbol}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SecurityDetailPayload>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, symbol]);

  const inst = data?.instrument;
  const q = data?.quote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!fixed !inset-0 !top-0 !left-0 z-50 flex h-[100dvh] w-screen !max-w-none flex-col gap-0 !translate-x-0 !translate-y-0 rounded-none border-0 p-0 ring-0",
          "bg-background text-foreground data-open:zoom-in-100 data-closed:zoom-out-100",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="font-heading text-2xl md:text-3xl">
            {symbol}
            {inst ? ` · ${inst.name}` : data?.quote ? "" : ""}
          </DialogTitle>
          {inst ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{inst.description}</p>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-6">
        {loading ? <p className="text-sm text-muted-foreground">Loading live security data…</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {data && q ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{q.provider}</Badge>
              {inst ? (
                <>
                  <Badge variant="secondary">{inst.assetClass}</Badge>
                  <Badge variant="secondary">{inst.sector}</Badge>
                  <Badge variant="secondary">{inst.region}</Badge>
                </>
              ) : null}
              <span className="text-sm text-muted-foreground">
                As of {new Date(q.asOf).toLocaleString()}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                label="Last"
                value={`${q.price.toFixed(2)} ${q.currency}`}
                sub={formatPct(q.changePct)}
                positive={q.changePct >= 0}
              />
              {q.dayHigh != null && q.dayLow != null ? (
                <Metric label="Day range" value={`${q.dayLow.toFixed(2)} – ${q.dayHigh.toFixed(2)}`} />
              ) : null}
              {q.volume != null ? (
                <Metric label="Volume" value={q.volume.toLocaleString()} sub="shares" />
              ) : null}
            </div>

            {position ? (
              <section className="rounded-lg border border-border p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your book
                </h4>
                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <BookStat k="Shares" v={position.shares.toFixed(1)} />
                  <BookStat k="Avg cost" v={position.avgCost.toFixed(2)} />
                  <BookStat k="Market value" v={formatInr(position.marketValue)} />
                  <BookStat k="Weight" v={formatPct(position.weight, 1)} />
                  <BookStat
                    k="Unrealized P&L"
                    v={formatInr(position.pnl)}
                    className={position.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}
                  />
                  <BookStat
                    k="Day"
                    v={formatPct(position.dayPct)}
                    className={position.dayPct >= 0 ? "text-emerald-600" : "text-rose-600"}
                  />
                </dl>
              </section>
            ) : null}

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fundamentals (live)
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                {q.marketCap != null ? <Row k="Market cap" v={formatCompact(q.marketCap)} /> : null}
                {q.pe != null ? <Row k="Trailing P/E" v={q.pe.toFixed(2)} /> : null}
                {q.forwardPe != null ? <Row k="Forward P/E" v={q.forwardPe.toFixed(2)} /> : null}
                {q.priceToBook != null ? <Row k="P/B" v={q.priceToBook.toFixed(2)} /> : null}
                {q.dividendYield != null ? <Row k="Div yield" v={`${(q.dividendYield * 100).toFixed(2)}%`} /> : null}
                {q.fiftyTwoWeekHigh != null ? <Row k="52W high" v={q.fiftyTwoWeekHigh.toFixed(2)} /> : null}
                {q.fiftyTwoWeekLow != null ? <Row k="52W low" v={q.fiftyTwoWeekLow.toFixed(2)} /> : null}
                {q.eps != null ? <Row k="EPS (TTM)" v={q.eps.toFixed(2)} /> : null}
                {inst ? <Row k="Model vol" v={`${(inst.vol * 100).toFixed(1)}%`} /> : null}
                {inst ? <Row k="Beta (model)" v={inst.betaMkt.toFixed(2)} /> : null}
              </dl>
            </section>

            {data.history.length > 0 ? (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Price — 1Y daily (Yahoo Finance)
                </h4>
                <div className="h-[min(420px,40vh)]">
                  <Lines
                    data={data.history.map((p) => ({ date: p.date, px: p.value }))}
                    keys={[{ key: "px", color: "#1a73e8", name: data.symbol }]}
                  />
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Data sources
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                {data.sources.map((s) => (
                  <li key={`${s.id}-${s.url}`} className="flex items-start gap-1">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {s.label}
                    </a>
                    <DataInfo
                      source={{ provider: s.label, url: s.url, asOf: data.quote.asOf }}
                      hubSyncedAt={data.fetchedAt}
                      note={s.usedFor}
                    />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Hub sync {new Date(data.fetchedAt).toLocaleString()}. Quotes are delayed/near-real-time per
                provider terms; not investment advice.
              </p>
              <Link
                href={`/research/${encodeURIComponent(data.symbol)}`}
                className="mt-2 inline-block text-sm text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Open in research workbench →
              </Link>
            </section>
          </div>
        ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookStat({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/50 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className={cn("mt-1 truncate text-sm font-medium tabular-nums", className)}>{v}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg">{value}</p>
      {sub ? (
        <p className={cn("text-sm", positive ? "text-emerald-600" : "text-rose-600")}>{sub}</p>
      ) : null}
    </div>
  );
}

function Row({
  k,
  v,
  className,
}: {
  k: string;
  v: string;
  className?: string;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("text-right", className)}>{v}</dd>
    </div>
  );
}

function formatCompact(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}
