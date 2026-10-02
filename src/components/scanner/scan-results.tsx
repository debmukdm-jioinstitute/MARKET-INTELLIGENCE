"use client";

import { SignedPct } from "@/components/ui/signed-value";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { METRIC_MEANINGS, SETUP_SCORE_TOOLTIP, setupScore, type ScanBias } from "./setup-score";

export interface ScanRow {
  symbol: string;
  name: string;
  industry: string;
  ltp: number;
  changePct: number;
  volume: number;
  volRatio: number;
  rsi: number | null;
  note: string;
}

type SortKey = "symbol" | "ltp" | "changePct" | "volRatio" | "rsi" | "score";

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function scoreChipClass(score: number) {
  if (score >= 75) return "bg-emerald-100 text-emerald-800";
  if (score >= 50) return "bg-blue-100 text-blue-800";
  if (score >= 25) return "bg-amber-100 text-amber-800";
  return "bg-stone-200 text-stone-600";
}

function RsiGauge({ rsi }: { rsi: number | null }) {
  if (rsi == null) return <span className="text-muted-foreground">n/a</span>;
  const color = rsi < 30 ? "bg-sky-500" : rsi > 70 ? "bg-amber-500" : "bg-stone-400";
  return (
    <span className="inline-flex items-center gap-1.5" title={METRIC_MEANINGS.rsi}>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-stone-200">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", color)} style={{ width: `${Math.min(100, Math.max(0, rsi))}%` }} />
      </span>
      <span className="tabular-nums">{rsi.toFixed(0)}</span>
    </span>
  );
}

const biasText = { buy: "text-emerald-700", sell: "text-rose-700", watch: "text-blue-700" } as const;

export function ScanResults({
  rows,
  scanId,
  scanLabel,
  bias,
  isLoading,
  onSelect,
}: {
  rows: ScanRow[];
  scanId: string;
  scanLabel: string;
  bias: ScanBias;
  isLoading: boolean;
  onSelect: (row: ScanRow) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [showIndustry, setShowIndustry] = useState(false);
  const [showSignal, setShowSignal] = useState(true);

  const scored = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        score: setupScore({ volRatio: r.volRatio, changePct: r.changePct, rsi: r.rsi }, bias).score,
      })),
    [rows, bias],
  );

  const sorted = useMemo(() => {
    if (!sort) return scored;
    const get = (s: (typeof scored)[number]) =>
      sort.key === "symbol" ? s.row.symbol : sort.key === "score" ? s.score : (s.row[sort.key] ?? -Infinity);
    return [...scored].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [scored, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key !== key ? { key, dir: "desc" } : s.dir === "desc" ? { key, dir: "asc" } : null));
  }

  function downloadCsv() {
    const head = ["Symbol", "Company", "Industry", "LTP (INR)", "Change %", "Vol x 20d avg", "RSI", "Setup score", "Signal"];
    const body = sorted.map(({ row: r, score }) => [
      r.symbol,
      r.name,
      r.industry,
      r.ltp.toFixed(2),
      r.changePct.toFixed(2),
      r.volRatio.toFixed(1),
      r.rsi == null ? "" : r.rsi.toFixed(1),
      String(score),
      r.note,
    ]);
    const blob = new Blob([[head, ...body].map((r) => r.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scanner-${scanId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading scan results">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
        ))}
      </div>
    );
  }

  const sortBtn = (key: SortKey, label: string, title: string) => (
    <button type="button" onClick={() => toggleSort(key)} title={title} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      <span aria-hidden className="text-[10px]">{sort?.key === key ? (sort.dir === "desc" ? "▼" : "▲") : "↕"}</span>
    </button>
  );

  const thCls = (numeric: boolean) =>
    cn("sticky top-0 z-10 bg-stone-100 px-2 py-2 font-semibold text-stone-500", numeric ? "text-right" : "text-left");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {rows.length} match{rows.length === 1 ? "" : "es"}
          {sort ? ` · sorted by ${sort.key}, ${sort.dir === "desc" ? "high to low" : "low to high"}` : ""} · tap a row to review it
        </p>
        <div className="flex items-center gap-3">
          <details className="relative">
            <summary className="cursor-pointer text-blue-700 underline-offset-2 hover:underline">Columns</summary>
            <div className="absolute right-0 z-20 mt-1 w-44 space-y-1 rounded-md border border-stone-200 bg-white p-2 shadow">
              <label className="flex items-center gap-2 text-foreground">
                <input type="checkbox" checked={showIndustry} onChange={(e) => setShowIndustry(e.target.checked)} /> Industry
              </label>
              <label className="flex items-center gap-2 text-foreground">
                <input type="checkbox" checked={showSignal} onChange={(e) => setShowSignal(e.target.checked)} /> Signal note
              </label>
            </div>
          </details>
          <button type="button" onClick={downloadCsv} className="text-blue-700 underline-offset-2 hover:underline">
            Download CSV
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-auto rounded-lg border border-stone-200 md:block" style={{ maxHeight: "32rem" }}>
        <table className="w-full text-sm">
          <caption className="sr-only">{scanLabel} results</caption>
          <thead>
            <tr>
              <th scope="col" className={thCls(false)}>{sortBtn("symbol", "Stock", "Sort by symbol")}</th>
              {showIndustry ? <th scope="col" className={thCls(false)}>Industry</th> : null}
              <th scope="col" className={thCls(true)}>{sortBtn("ltp", "LTP (₹)", METRIC_MEANINGS.ltp)}</th>
              <th scope="col" className={thCls(true)}>{sortBtn("changePct", "Change", METRIC_MEANINGS.change)}</th>
              <th scope="col" className={thCls(true)}>{sortBtn("volRatio", "Vol ×20d", METRIC_MEANINGS.volRatio)}</th>
              <th scope="col" className={thCls(true)}>{sortBtn("rsi", "RSI", METRIC_MEANINGS.rsi)}</th>
              <th scope="col" className={thCls(true)}>
                <span title={SETUP_SCORE_TOOLTIP} className="cursor-help underline decoration-dotted underline-offset-2">
                  {sortBtn("score", "Setup", SETUP_SCORE_TOOLTIP)}
                </span>
              </th>
              {showSignal ? <th scope="col" className={thCls(false)}>Why it matched</th> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ row: r, score }) => (
              <tr
                key={r.symbol}
                onClick={() => onSelect(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r);
                  }
                }}
                tabIndex={0}
                className="cursor-pointer border-t border-stone-100 bg-white hover:bg-blue-50/60 focus:bg-blue-50/60 focus:outline-none"
              >
                <td className="whitespace-nowrap px-2 py-2">
                  <span className="font-bold text-blue-700">{r.symbol}</span>
                  <span className="ml-2 text-stone-500">{r.name}</span>
                </td>
                {showIndustry ? <td className="whitespace-nowrap px-2 py-2 text-stone-500">{r.industry}</td> : null}
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums" title={METRIC_MEANINGS.ltp}>
                  {r.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right" title={METRIC_MEANINGS.change}>
                  <SignedPct value={r.changePct / 100} digits={2} />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums" title={METRIC_MEANINGS.volRatio}>
                  {r.volRatio.toFixed(1)}×
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  <RsiGauge rsi={r.rsi} />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <span title={SETUP_SCORE_TOOLTIP} className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", scoreChipClass(score))}>
                    {score}
                  </span>
                </td>
                {showSignal ? (
                  <td className="max-w-[16rem] truncate px-2 py-2 text-stone-600" title={r.note}>
                    <span className={biasText[bias]}>{r.note}</span>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {sorted.map(({ row: r, score }) => (
          <button
            key={r.symbol}
            type="button"
            onClick={() => onSelect(r)}
            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm active:bg-blue-50/60"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-bold text-blue-700">{r.symbol}</span>
                <span className="ml-1.5 truncate text-xs text-stone-500">{r.name}</span>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", scoreChipClass(score))} title={SETUP_SCORE_TOOLTIP}>
                {score}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="tabular-nums text-foreground">₹{r.ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              <SignedPct value={r.changePct / 100} digits={2} />
              <span className="tabular-nums text-stone-500">{r.volRatio.toFixed(1)}× vol</span>
              <RsiGauge rsi={r.rsi} />
            </div>
            <p className="mt-1.5 truncate text-xs text-stone-500">
              <span className={biasText[bias]}>{r.note}</span>
            </p>
          </button>
        ))}
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer text-blue-700 hover:underline">How is the setup score calculated?</summary>
        <p className="mt-1 leading-relaxed">{SETUP_SCORE_TOOLTIP} Volume 2× or more earns full marks; the day&apos;s move only scores when it agrees with the scan&apos;s direction; RSI loses points at extremes. Missing RSI gets half credit. Nothing here is a recommendation.</p>
      </details>
    </div>
  );
}
