"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import {
  SCANNER_CATEGORIES,
  zeroResultSuggestions,
} from "@/lib/scanner/scanner-ui-meta";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { SignInRequiredBanner } from "@/components/auth/sign-in-required-banner";
import { AuthRequiredError, fetchJsonAuth, isAuthRequiredError } from "@/lib/scanner/auth-fetcher";
import useSWR from "swr";
import { ScanPresets } from "@/components/scanner/scan-presets";
import { ScanResults, type ScanRow } from "@/components/scanner/scan-results";
import { StockDrawer } from "@/components/scanner/stock-drawer";
import { QuestToasts, ScannerJourney, useScannerQuests } from "@/components/scanner/scanner-quests";

type Payload = {
  run: { asOf: string; lastBar: string; universe: number; scanned: number; failed: number } | null;
  scanners: { id: string; label: string; description: string; bias: "buy" | "sell" | "watch"; matches: number }[];
  results?: ScanRow[];
  error?: string;
};

const fetcher = (url: string) => fetchJsonAuth<Payload>(url);
const biasCls = { buy: "text-emerald-700", sell: "text-rose-700", watch: "text-blue-700" } as const;

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
  const [selected, setSelected] = useState<ScanRow | null>(null);
  const { data, error, isLoading } = useSWR(`/api/scanner?scanner=${active}`, fetcher, { refreshInterval: 5 * 60_000 });
  const needsAuth = isAuthRequiredError(error);
  const current = data?.scanners.find((s) => s.id === active);
  const { state: questState, ready: questsReady, toasts, recordScan } = useScannerQuests();

  const pickScan = (id: string) => {
    setActive(id);
    setSelected(null);
    recordScan(id);
  };

  const scanners = data?.scanners;
  const scannerById = useMemo(() => new Map(scanners?.map((s) => [s.id, s]) ?? []), [scanners]);
  const matchesById = useMemo(() => new Map(scanners?.map((s) => [s.id, s.matches]) ?? []), [scanners]);

  const visibleScanners = useMemo(() => {
    if (!scanners) return [];
    if (showAllScans) return scanners;
    const ids = new Set<string>();
    if (category !== "all") {
      const cat = SCANNER_CATEGORIES.find((c) => c.id === category);
      cat?.scannerIds.forEach((id) => ids.add(id));
    } else {
      SCANNER_CATEGORIES.forEach((c) => c.scannerIds.forEach((id) => ids.add(id)));
    }
    return scanners.filter((s) => ids.has(s.id));
  }, [scanners, showAllScans, category]);

  const fallbacks = zeroResultSuggestions(active).map((id) => scannerById.get(id)).filter(Boolean);
  const scanExplanation = useScanExplanation(current?.id, current?.description);
  const currentBias = current?.bias ?? "watch";

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-16">
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
        <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">No scan has run yet. The first scan runs automatically after the next NSE close.</p>
      ) : null}
      {data?.run ? (
        <p className="text-sm text-stone-500">
          Latest session: <span className="font-semibold text-foreground">{data.run.lastBar}</span> ·{" "}
          <span className="tabular-nums">{data.run.scanned}</span> of{" "}
          <span className="tabular-nums">{data.run.universe}</span> stocks scanned
          {data.run.failed > 0 ? (
            <> · <span className="tabular-nums">{data.run.failed}</span> skipped (missing price history)</>
          ) : null}{" "}
          · updated{" "}
          <span className="tabular-nums">{new Date(data.run.asOf).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span>
        </p>
      ) : null}

      {!needsAuth ? <ScannerJourney state={questState} ready={questsReady} /> : null}

      <Panel title="Find stocks" subtitle="Start with a plain-English idea, or browse every scan below.">
        <ScanPresets matchesById={matchesById} active={active} onPick={pickScan} />

        <div className="mt-5 border-t border-stone-100 pt-4">
          {!showAllScans ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-stone-500">Browse by idea:</span>
              {SCANNER_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(category === c.id ? "all" : c.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    category === c.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-stone-200 bg-white hover:bg-stone-50",
                  )}
                  title={c.hint}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAllScans(true)}
                className="ml-auto text-xs font-semibold text-blue-700 hover:underline"
              >
                All scans ({data?.scanners.length ?? 0}) →
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAllScans(false)} className="text-xs font-semibold text-blue-700 hover:underline">
              ← Back to guided scans
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {visibleScanners.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickScan(s.id)}
                title={s.description}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active === s.id ? "border-blue-600 bg-blue-600 text-white" : "border-stone-200 bg-white hover:bg-stone-50",
                )}
              >
                {s.label}{" "}
                <span className={cn("tabular-nums", active === s.id ? "text-white/80" : "text-stone-400")}>{s.matches}</span>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title={current?.label ?? "Results"}
        subtitle={current?.description}
        action={
          current ? (
            <span className={cn("rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold", biasCls[current.bias])}>
              {current.bias === "buy" ? "Bullish screen" : current.bias === "sell" ? "Bearish screen" : "Watchlist screen"}
            </span>
          ) : undefined
        }
      >
        {scanExplanation ? (
          <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-stone-600">
            <span className="font-semibold text-blue-700">In plain English: </span>
            {scanExplanation}
          </p>
        ) : null}
        {data?.results && data.results.length === 0 && data.run ? (
          <div className="space-y-2 text-sm text-stone-500">
            <p>No stocks match this scan in the latest session.</p>
            {fallbacks.length ? (
              <p>
                Try a broader screen:{" "}
                {fallbacks.map((s, i) => (
                  <span key={s!.id}>
                    {i > 0 ? " or " : null}
                    <button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => pickScan(s!.id)}>
                      {s!.label}
                    </button>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : null}
        {data?.results?.length ? (
          <ScanResults
            rows={data.results}
            scanId={active}
            scanLabel={current?.label ?? active}
            bias={currentBias}
            isLoading={false}
            onSelect={setSelected}
          />
        ) : null}
        {!data?.results && !needsAuth && isLoading ? (
          <ScanResults rows={[]} scanId={active} scanLabel={current?.label ?? active} bias={currentBias} isLoading onSelect={setSelected} />
        ) : null}
      </Panel>

      <StockDrawer
        row={selected}
        scanLabel={current?.label ?? active}
        bias={currentBias}
        onClose={() => setSelected(null)}
      />
      <QuestToasts toasts={toasts} />

      <p className="text-xs text-stone-500">Scans use delayed daily data from Yahoo Finance. Research and education only — not investment advice.</p>
    </div>
  );
}
