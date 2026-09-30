"use client";

import { DataTable } from "@/components/ui/data-table";
import { SignedPct } from "@/components/ui/signed-value";
import { PageHeader, Panel } from "@/components/layout/page-header";
import {
  SCANNER_CATEGORIES,
  SCANNER_START_HERE_IDS,
  zeroResultSuggestions,
} from "@/lib/scanner/scanner-ui-meta";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
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

function useScanExplanation(scannerId: string | undefined, description: string | undefined) {
  const { data } = useSWR<{ explanation: string | null }>(
    scannerId && description ? `/api/hf/scan-explain?scanner=${scannerId}&description=${encodeURIComponent(description)}` : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );
  return data?.explanation ?? null;
}

export default function ScannerPage() {
  const [active, setActive] = useState("high52w");
  const [showAllScans, setShowAllScans] = useState(false);
  const [category, setCategory] = useState<(typeof SCANNER_CATEGORIES)[number]["id"] | "all">("all");
  const { data, error, isLoading } = useSWR(`/api/scanner?scanner=${active}`, fetcher, { refreshInterval: 5 * 60_000 });
  const needsAuth = isAuthRequiredError(error);
  const current = data?.scanners.find((s) => s.id === active);

  const scannerById = useMemo(() => new Map(data?.scanners.map((s) => [s.id, s]) ?? []), [data?.scanners]);

  const visibleScanners = useMemo(() => {
    if (!data?.scanners) return [];
    if (showAllScans) return data.scanners;
    const ids = new Set<string>(SCANNER_START_HERE_IDS);
    if (category !== "all") {
      const cat = SCANNER_CATEGORIES.find((c) => c.id === category);
      cat?.scannerIds.forEach((id) => ids.add(id));
    } else {
      SCANNER_CATEGORIES.forEach((c) => c.scannerIds.forEach((id) => ids.add(id)));
    }
    return data.scanners.filter((s) => ids.has(s.id));
  }, [data?.scanners, showAllScans, category]);

  const fallbacks = zeroResultSuggestions(active).map((id) => scannerById.get(id)).filter(Boolean);
  const scanExplanation = useScanExplanation(current?.id, current?.description);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <PageHeader
        kicker="Scanner"
        title="Nifty 500 stock scanner"
        subtitle="Daily price screens across the Nifty 500 — refreshed after each NSE close. Pick a starter scan or open a category; definitions follow the open-source PKScreener menu."
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
          Latest session: <span className="text-foreground">{data.run.lastBar}</span> ·{" "}
          <span className="tabular-nums">{data.run.scanned}</span> of{" "}
          <span className="tabular-nums">{data.run.universe}</span> stocks scanned
          {data.run.failed > 0 ? (
            <> · <span className="tabular-nums">{data.run.failed}</span> skipped (missing price history)</>
          ) : null}{" "}
          · updated{" "}
          <span className="tabular-nums">{new Date(data.run.asOf).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span>
        </p>
      ) : null}

      <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Start here</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Four common screens — no jargon required.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCANNER_START_HERE_IDS.map((id) => {
              const s = scannerById.get(id);
              if (!s) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActive(id);
                    setShowAllScans(false);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    active === id ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background hover:bg-accent",
                  )}
                >
                  {s.label}{" "}
                  <span className={cn("tabular-nums", active === id ? "text-white/80" : "text-muted-foreground")}>{s.matches}</span>
                </button>
              );
            })}
          </div>
        </div>

        {!showAllScans ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-xs font-semibold text-muted-foreground">Browse by idea:</span>
            {SCANNER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(category === c.id ? "all" : c.id)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium",
                  category === c.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent",
                )}
                title={c.hint}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAllScans(true)}
              className="ml-auto text-xs font-semibold text-primary hover:underline"
            >
              All scans ({data?.scanners.length ?? 0})
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAllScans(false)} className="text-xs font-semibold text-primary hover:underline">
            ← Back to guided scans
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          {visibleScanners.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                active === s.id ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background hover:bg-accent",
              )}
            >
              {s.label}{" "}
              <span className={cn("tabular-nums", active === s.id ? "text-white/80" : "text-muted-foreground")}>{s.matches}</span>
            </button>
          ))}
        </div>
      </div>

      <Panel title={current?.label ?? "Results"} subtitle={current?.description}>
        {scanExplanation ? (
          <p className="-mt-2 mb-3 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">In plain English: </span>
            {scanExplanation}
          </p>
        ) : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {data?.results && data.results.length === 0 && data.run ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>No stocks match this scan in the latest session.</p>
            {fallbacks.length ? (
              <p>
                Try a broader screen:{" "}
                {fallbacks.map((s, i) => (
                  <span key={s!.id}>
                    {i > 0 ? " or " : null}
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setActive(s!.id)}>
                      {s!.label}
                    </button>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : null}
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
