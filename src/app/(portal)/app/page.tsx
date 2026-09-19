"use client";

import { NewsStream } from "@/components/feeds/news-stream";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { analyzePortfolio, currentMarketValue } from "@/lib/analytics";
import { formatPct, formatUsd } from "@/lib/format";
import { getReturn, lastClose, marketTape } from "@/lib/market";
import Link from "next/link";
import { useMemo } from "react";

const TAPE_WATCH = ["SPY", "QQQ", "TLT", "GLD", "USO", "UUP", "HYG", "EEM", "NVDA", "AAPL"];

export default function CommandPage() {
  const { portfolios } = usePortfolio();
  const { data } = useFeedHub(60_000);
  const live = quoteMap(data);

  const books = useMemo(
    () =>
      portfolios.map((p) => {
        const a = analyzePortfolio(p, p.benchmark);
        return { p, a, mv: currentMarketValue(p.holdings) + p.cash };
      }),
    [portfolios],
  );

  const tape = useMemo(() => {
    const sim = marketTape();
    return TAPE_WATCH.map((symbol) => {
      const q = live.get(symbol);
      const row = sim.find((r) => r.symbol === symbol);
      return {
        symbol,
        name: row?.name ?? symbol,
        last: q?.price ?? row?.last ?? lastClose(symbol),
        chg: q?.changePct ?? row?.chg ?? getReturn(symbol, 1),
        live: Boolean(q),
      };
    });
  }, [live]);

  const aum = books.reduce((s, b) => s + b.mv, 0);
  const cpi = data?.macro.find((m) => m.id.includes("cpi") || m.name.toLowerCase().includes("cpi"));
  const fed = data?.macro.find((m) => m.id.includes("fed") || m.name.toLowerCase().includes("fed"));

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
        <Stat label="Macro CPI (live)" value={cpi ? `${cpi.latest.toFixed(1)} ${cpi.unit}` : "—"} />
        <Stat label="Policy rate (live)" value={fed ? `${fed.latest.toFixed(2)}%` : "—"} />
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
        <Panel title="Market tape" subtitle="Yahoo / Stooq — auto refresh">
          <ul className="space-y-2 font-mono text-sm">
            {tape.map((row) => (
              <li key={row.symbol} className="flex justify-between">
                <span>
                  {row.symbol}
                  {row.live ? <span className="text-emerald-400">*</span> : null}
                </span>
                <span className={row.chg >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {row.last.toFixed(2)} {formatPct(row.chg)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Exchange & regulatory wire" subtitle="NSE · BSE · RBI · SEC" className="xl:col-span-2">
          <NewsStream items={data?.news ?? []} limit={8} />
          <Link href="/feeds" className="mt-3 inline-block text-xs text-primary hover:underline">
            Open full feed console →
          </Link>
        </Panel>
        <div className="grid gap-3">
          <Jump href="/backtest" title="Backtest" copy="Replay allocation rules against the full simulated history." />
          <Jump href="/optimizer" title="Optimize" copy="Max Sharpe, min vol, and risk-parity weights on the book universe." />
          <Jump href="/scenarios" title="Stress" copy="Apply macro regimes and inspect P&L by name." />
        </div>
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
