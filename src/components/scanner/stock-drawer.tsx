"use client";

import { SignedPct } from "@/components/ui/signed-value";
import Link from "next/link";
import { useEffect } from "react";
import { METRIC_MEANINGS, setupScore, type ScanBias } from "./setup-score";
import type { ScanRow } from "./scan-results";

function Metric({ label, value, meaning }: { label: string; value: React.ReactNode; meaning: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="text-xs font-semibold text-stone-500" title={meaning}>{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{meaning}</p>
    </div>
  );
}

export function StockDrawer({
  row,
  scanLabel,
  bias,
  onClose,
}: {
  row: ScanRow | null;
  scanLabel: string;
  bias: ScanBias;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [row, onClose]);

  if (!row) return null;

  const { score, label, parts } = setupScore({ volRatio: row.volRatio, changePct: row.changePct, rsi: row.rsi }, bias);
  const tradeLabHref = `/intelligence/trade-lab?symbol=${encodeURIComponent(row.symbol)}`;
  const researchHref = `/research/${encodeURIComponent(row.symbol)}`;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${row.symbol} review`}>
      <button type="button" aria-label="Close review" onClick={onClose} className="absolute inset-0 bg-stone-900/40" />
      <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[430px] sm:rounded-none sm:rounded-l-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-blue-700">Matched “{scanLabel}”</p>
            <h3 className="mt-0.5 text-xl font-bold text-foreground">{row.symbol}</h3>
            <p className="text-sm text-stone-500">{row.name} · {row.industry}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-2.5 py-1 text-sm text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            ₹{row.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <SignedPct value={row.changePct / 100} digits={2} label="today" />
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-bold text-blue-800">Why it matched</p>
          <p className="mt-0.5 text-sm text-blue-900">{row.note}</p>
          <p className="mt-1 text-xs text-blue-800/70">{METRIC_MEANINGS.signal} A match is a starting point for research — not a recommendation.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Volume vs 20-day avg" value={`${row.volRatio.toFixed(1)}×`} meaning={METRIC_MEANINGS.volRatio} />
          <Metric
            label="RSI (14-day)"
            value={row.rsi == null ? "n/a" : row.rsi.toFixed(0)}
            meaning={METRIC_MEANINGS.rsi}
          />
        </div>

        <div className="mt-4 rounded-xl border border-stone-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Setup score</p>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-sm font-bold tabular-nums text-foreground">
              {score} · {label}
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {parts.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-600">{p.name}</span>
                  <span className="tabular-nums text-stone-500">{p.points}/{p.max}</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${(p.points / p.max) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-stone-500">{p.why}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-stone-500">Keep researching</p>
        <div className="mt-2 grid gap-2">
          <Link href="/research/ai-desk" className="rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md">
            <span className="block text-sm font-bold text-blue-700">Debate it on AI Desk →</span>
            <span className="block text-xs text-stone-500">Hear five AI analysts argue the bull and bear case for {row.symbol}.</span>
          </Link>
          <Link href={tradeLabHref} className="rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md">
            <span className="block text-sm font-bold text-blue-700">Backtest it in Trade Lab →</span>
            <span className="block text-xs text-stone-500">Run fixed-rule strategies on {row.symbol}’s real price history.</span>
          </Link>
          <Link href="/intelligence/alerts" className="rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md">
            <span className="block text-sm font-bold text-blue-700">Watch it with Alerts →</span>
            <span className="block text-xs text-stone-500">Get notified when {row.symbol}’s price, volume, or RSI moves.</span>
          </Link>
          <Link href={researchHref} className="rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md">
            <span className="block text-sm font-bold text-blue-700">Full research page →</span>
            <span className="block text-xs text-stone-500">Fundamentals, technicals, and news for {row.symbol}.</span>
          </Link>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          Prices are delayed daily data from Yahoo Finance, refreshed after each NSE close. Research and education only — not investment advice.
        </p>
      </div>
    </div>
  );
}
