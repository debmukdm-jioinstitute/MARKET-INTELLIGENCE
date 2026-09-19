"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { analyzePortfolio, currentMarketValue } from "@/lib/analytics";
import { formatPct, formatUsd } from "@/lib/format";
import { MACRO, marketTape } from "@/lib/market";
import Link from "next/link";
import { useMemo } from "react";

export default function CommandPage() {
  const { portfolios } = usePortfolio();
  const books = useMemo(
    () =>
      portfolios.map((p) => {
        const a = analyzePortfolio(p, p.benchmark);
        return { p, a, mv: currentMarketValue(p.holdings) + p.cash };
      }),
    [portfolios],
  );
  const tape = marketTape();
  const aum = books.reduce((s, b) => s + b.mv, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Command"
        title="Institutional virtual desk"
        subtitle="Manage model books like a fund manager: research, allocate, risk, attribute, optimize, and backtest — with professional reporting."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Platform AUM" value={formatUsd(aum)} />
        <Stat label="Active books" value={String(portfolios.length)} />
        <Stat label="Macro nowcast CPI" value={`${MACRO[1]!.latest.toFixed(1)}%`} />
        <Stat label="Fed funds" value={`${MACRO[3]!.latest.toFixed(2)}%`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Books" subtitle="Click through to the working portfolio" className="xl:col-span-2">
          <div className="space-y-3">
            {books.map(({ p, a, mv }) => (
              <Link
                key={p.id}
                href="/portfolio"
                className="flex items-center justify-between rounded-md border border-border px-4 py-3 transition hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.strategy}</p>
                </div>
                <div className="text-right font-mono text-sm">
                  <p>{formatUsd(mv)}</p>
                  <p className={a.kpis[2]!.value >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {formatPct(a.kpis[2]!.value)} total
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="Market tape" subtitle="Simulated closes, factor-consistent">
          <ul className="space-y-2 font-mono text-sm">
            {tape.map((row) => (
              <li key={row.symbol} className="flex justify-between">
                <span>{row.symbol}</span>
                <span className={row.chg >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {row.last.toFixed(2)} {formatPct(row.chg)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Jump href="/backtest" title="Backtest" copy="Replay allocation rules against the full simulated history." />
        <Jump href="/optimizer" title="Optimize" copy="Max Sharpe, min vol, and risk-parity weights on the book universe." />
        <Jump href="/scenarios" title="Stress" copy="Apply macro regimes and inspect P&L by name." />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Jump({ href, title, copy }: { href: string; title: string; copy: string }) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card p-4 hover:bg-accent">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
    </Link>
  );
}
