"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

type Row = { symbol: string; name: string; industry: string; ltp: number; changePct: number; volume: number; volRatio: number; rsi: number | null; note: string };
type Payload = {
  run: { asOf: string; lastBar: string; universe: number; scanned: number; failed: number } | null;
  scanners: { id: string; label: string; description: string; bias: "buy" | "sell" | "watch"; matches: number }[];
  results?: Row[];
  error?: string;
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Payload>);
const biasCls = { buy: "text-emerald-600", sell: "text-rose-600", watch: "text-blue-600" } as const;

export default function ScannerPage() {
  const [active, setActive] = useState("high52w");
  const { data, isLoading } = useSWR(`/api/scanner?scanner=${active}`, fetcher, { refreshInterval: 5 * 60_000 });
  const current = data?.scanners.find((s) => s.id === active);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <PageHeader
        kicker="Scanner"
        title="Nifty 500 Stock Scanner"
        subtitle="Technical scans over daily prices for every Nifty 500 stock, refreshed after each NSE close. Scan definitions follow the PKScreener menu (open-source, pkjmesra/PKScreener)."
      />

      {data?.error ? <p className="text-sm text-rose-600">{data.error}</p> : null}
      {data && !data.run ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No scan has run yet. The first scan runs automatically after the next NSE close.</p>
      ) : null}
      {data?.run ? (
        <p className="text-sm text-muted-foreground">
          Latest session: <span className="text-foreground">{data.run.lastBar}</span> · {data.run.scanned} of {data.run.universe} stocks scanned · updated {new Date(data.run.asOf).toLocaleString()}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {data?.scanners.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active === s.id ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-card hover:bg-accent",
            )}
          >
            {s.label} <span className={cn("tabular-nums", active === s.id ? "text-white/80" : "text-muted-foreground")}>{s.matches}</span>
          </button>
        ))}
      </div>

      <Panel title={current?.label ?? "Results"} subtitle={current?.description}>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {data?.results && data.results.length === 0 && data.run ? <p className="text-sm text-muted-foreground">No stocks match this scan in the latest session.</p> : null}
        {data?.results?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1 font-medium">Symbol</th>
                  <th className="px-2 py-1 font-medium">Industry</th>
                  <th className="px-2 py-1 text-right font-medium">LTP (₹)</th>
                  <th className="px-2 py-1 text-right font-medium">Change</th>
                  <th className="px-2 py-1 text-right font-medium">Vol ×20d</th>
                  <th className="px-2 py-1 text-right font-medium">RSI</th>
                  <th className="px-2 py-1 font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.symbol} className="border-t border-border/50">
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <Link href={`/research/${encodeURIComponent(r.symbol)}`} className="font-semibold text-primary hover:underline">{r.symbol}</Link>
                      <span className="ml-2 text-muted-foreground">{r.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.industry}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className={cn("px-2 py-1.5 text-right tabular-nums", r.changePct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {r.changePct >= 0 ? "+" : ""}{r.changePct.toFixed(2)}%
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.volRatio.toFixed(1)}×</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.rsi == null ? "—" : r.rsi.toFixed(0)}</td>
                    <td className={cn("px-2 py-1.5", current ? biasCls[current.bias] : "")}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
      <p className="text-xs text-muted-foreground">Scans use delayed daily data from Yahoo Finance. Research and education only — not investment advice.</p>
    </div>
  );
}
