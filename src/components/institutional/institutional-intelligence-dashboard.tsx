"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { useInstitutionalHub } from "@/hooks/use-institutional-hub";
import type { FlowDirection, InstitutionalSignal, InstitutionalTracker } from "@/lib/institutional/types";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ExternalLink,
  Landmark,
  Minus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

function directionIcon(dir: FlowDirection) {
  if (dir === "up") return <ArrowUpRight className="size-4 text-emerald-600" />;
  if (dir === "down") return <ArrowDownRight className="size-4 text-rose-600" />;
  if (dir === "na") return <Minus className="size-4 text-muted-foreground" />;
  return <Minus className="size-4 text-amber-600" />;
}

function directionBadge(dir: FlowDirection) {
  const label =
    dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "na" ? "—" : "→";
  return (
    <span
      className={cn(
        "inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
        dir === "up" && "bg-emerald-500/15 text-emerald-700",
        dir === "down" && "bg-rose-500/15 text-rose-700",
        dir === "neutral" && "bg-amber-500/15 text-amber-800",
        dir === "na" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function fmtCr(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })} cr`;
}

function SignalCard({ signal }: { signal: InstitutionalSignal }) {
  const inner = (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {directionIcon(signal.direction)}
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{signal.label}</span>
        </div>
        {directionBadge(signal.direction)}
      </div>
      <p className="mt-2 text-sm font-bold text-foreground">{signal.headline}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{signal.detail}</p>
    </div>
  );
  if (signal.href?.startsWith("/")) {
    return (
      <Link href={signal.href} className="block h-full">
        {inner}
      </Link>
    );
  }
  if (signal.href?.startsWith("http")) {
    return (
      <a href={signal.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    );
  }
  return inner;
}

function FlowTile({
  title,
  today,
  m1,
  ytd,
}: {
  title: string;
  today: number | null;
  m1: number | null;
  ytd: number | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{fmtCr(today)}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">~1M:</span> {fmtCr(m1)}
        <span className="mx-2 text-border">·</span>
        <span className="font-semibold text-foreground">YTD:</span> {fmtCr(ytd)}
      </p>
    </div>
  );
}

function coveragePill(c: InstitutionalTracker["coverage"]) {
  const map = {
    live: "bg-emerald-500/15 text-emerald-700",
    partial: "bg-amber-500/15 text-amber-800",
    planned: "bg-muted text-muted-foreground",
    unavailable: "bg-rose-500/10 text-rose-700",
  };
  return (
    <span className={cn("rounded px-2 py-0.5 text-[11px] font-bold uppercase", map[c])}>{c}</span>
  );
}

export function InstitutionalIntelligenceDashboard() {
  const { data, loading, error, reload } = useInstitutionalHub();

  return (
    <div className="portal-page space-y-8 pb-12">
      <PageHeader
        titleAs="h1"

        title="Smart money & ownership radar"
        subtitle="FII/FPI and DII cash from NSE, mutual-fund books from AMFI disclosures, plus a roadmap for promoters, insurers, and insider filings."
        trust={{
          source: "NSE FII/DII · AMFI portfolio cycle · SEBI/NSDL/CDSL reference links",
          asOf: data?.fetchedAt,
          methodology:
            "Smart Money score blends ~22-session DII and MF net capital vs FII cash; promoter/insider cards stay honest until shareholding feeds ship.",
        }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => reload()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {loading && !data ? (
        <GlassLoader variant="card" message="Loading institutional flows & smart-money signals..." detail="Parsing NSE FII/DII cash books, bulk deals & AMFI mutual-fund accumulation" statusBadge="SMART MONEY RADAR" icon="chart" />
      ) : null}

      {data ? (
        <>
          <section className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <TrendingUp className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Smart Money Flow</p>
                  <p className="text-lg font-bold text-foreground">{data.smartMoney.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums text-foreground">{data.smartMoney.score}</p>
                <p className="text-xs text-muted-foreground">score −100…100</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{data.smartMoney.summary}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Ownership signals</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.signals.map((s) => (
                <SignalCard key={s.id} signal={s} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <FlowTile
              title={data.moneyFlow.fii.label}
              today={data.moneyFlow.fii.today}
              m1={data.moneyFlow.fii.m1}
              ytd={data.moneyFlow.fii.ytd}
            />
            <FlowTile
              title={data.moneyFlow.dii.label}
              today={data.moneyFlow.dii.today}
              m1={data.moneyFlow.dii.m1}
              ytd={data.moneyFlow.dii.ytd}
            />
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Investor trackers</h2>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-bold">Segment</th>
                    <th className="px-4 py-2.5 font-bold">Coverage</th>
                    <th className="px-4 py-2.5 font-bold">Summary</th>
                    <th className="px-4 py-2.5 font-bold">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trackers.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-semibold text-foreground">{t.label}</td>
                      <td className="px-4 py-3">{coveragePill(t.coverage)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.summary}</td>
                      <td className="px-4 py-3">
                        {t.href ? (
                          t.href.startsWith("/") ? (
                            <Link href={t.href} className="text-xs font-semibold text-primary hover:underline">
                              View
                            </Link>
                          ) : (
                            <a
                              href={t.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              Source <ExternalLink className="size-3" />
                            </a>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Building2 className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider">MF net buying (top)</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {data.mutualFunds.message}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Landmark className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Source catalog</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {data.sourceCatalog.map((s) => (
                  <li key={s.id} className="text-xs">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {s.label}
                    </a>
                    <span className="text-muted-foreground"> — {s.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
