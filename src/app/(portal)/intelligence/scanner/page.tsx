"use client";

import { DataTable } from "@/components/ui/data-table";
import { SignedPct } from "@/components/ui/signed-value";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { SignInRequiredBanner } from "@/components/auth/sign-in-required-banner";
import { AuthRequiredError, fetchJsonAuth, isAuthRequiredError } from "@/lib/scanner/auth-fetcher";
import useSWR from "swr";

type Row = { symbol: string; name: string; industry: string; ltp: number; changePct: number; volume: number; volRatio: number; rsi: number | null; note: string };
type Payload = {
  run: { asOf: string; lastBar: string; universe: number; scanned: number; failed: number } | null;
  scanners: { id: string; label: string; description: string; bias: "buy" | "sell" | "watch"; matches: number }[];
  results?: Row[];
  error?: string;
};

const fetcher = (url: string) => fetchJsonAuth<Payload>(url);
const biasCls = { buy: "text-emerald-600", sell: "text-rose-600", watch: "text-blue-600" } as const;

export default function ScannerPage() {
  const [active, setActive] = useState("high52w");
  const { data, error, isLoading } = useSWR(`/api/scanner?scanner=${active}`, fetcher, { refreshInterval: 5 * 60_000 });
  const needsAuth = isAuthRequiredError(error);
  const current = data?.scanners.find((s) => s.id === active);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <PageHeader
        kicker="Scanner"
        title="Nifty 500 Stock Scanner"
        subtitle="Technical scans over daily prices for every Nifty 500 stock, refreshed after each NSE close. Scan definitions follow the PKScreener menu (open-source, pkjmesra/PKScreener)."
        trust={{ source: "NSE daily prices (PKScreener scan definitions)", asOf: data?.run?.asOf, delayed: "Refreshed after each NSE close", note: "Technical screens, not recommendations" }}
        />

      {needsAuth ? <SignInRequiredBanner feature="the Nifty 500 scanner" nextPath="/intelligence/scanner" /> : null}
      {!needsAuth && error && !(error instanceof AuthRequiredError) ? (
        <p className="text-sm text-rose-600">{error instanceof Error ? error.message : String(error)}</p>
      ) : null}
      {!needsAuth && data && !data.run ? (
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
          <DataTable
            caption={`${current?.label ?? "Scan"} results`}
            summary={`Scan: ${current?.label ?? active}`}
            filename={`scanner-${active}`}
            rows={data.results}
            rowKey={(r) => r.symbol}
            columns={[
              {
                key: "symbol",
                label: "Symbol",
                value: (r) => r.symbol,
                render: (r) => (
                  <>
                    <Link href={`/research/${encodeURIComponent(r.symbol)}`} className="font-semibold text-primary hover:underline">{r.symbol} ›</Link>
                    <span className="ml-2 text-muted-foreground">{r.name}</span>
                  </>
                ),
              },
              { key: "industry", label: "Industry", value: (r) => r.industry, render: (r) => <span className="text-muted-foreground">{r.industry}</span>, defaultVisible: false },
              { key: "ltp", label: "LTP (₹)", numeric: true, value: (r) => r.ltp, render: (r) => r.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
              { key: "chg", label: "Change", numeric: true, value: (r) => r.changePct, render: (r) => <SignedPct value={r.changePct / 100} /> },
              { key: "vol", label: "Vol ×20d", numeric: true, value: (r) => r.volRatio, render: (r) => `${r.volRatio.toFixed(1)}×` },
              { key: "rsi", label: "RSI", numeric: true, value: (r) => r.rsi, render: (r) => (r.rsi == null ? "n/a" : r.rsi.toFixed(0)) },
              { key: "signal", label: "Signal", value: (r) => r.note, render: (r) => <span className={current ? biasCls[current.bias] : ""}>{r.note}</span> },
            ]}
          />
        ) : null}
      </Panel>
      <p className="text-xs text-muted-foreground">Scans use delayed daily data from Yahoo Finance. Research and education only — not investment advice.</p>
    </div>
  );
}
