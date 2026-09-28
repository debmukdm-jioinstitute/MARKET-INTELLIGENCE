"use client";

import { Panel } from "@/components/layout/page-header";
import { findIndiaInstrument } from "@/lib/feeds/india/instruments";
import { useOptionChain, useOptionExpiries } from "@/hooks/use-option-chain";
import { fmtInr, fmtNum } from "@/lib/format-india";
import Link from "next/link";
import { useMemo } from "react";

interface OptionsSnapshotPanelProps {
  symbol: string;
  instrumentKey?: string;
}

export function OptionsSnapshotPanel({ symbol, instrumentKey }: OptionsSnapshotPanelProps) {
  // Eligibility check: resolve F&O instrument key
  const instrument = useMemo(() => {
    return findIndiaInstrument(symbol);
  }, [symbol]);

  const effectiveKey = instrumentKey ?? instrument?.instrumentKey;

  // If not an F&O-eligible underlying, return null immediately without making network calls
  if (!effectiveKey) {
    return null;
  }

  return <OptionsSnapshotLoader symbol={symbol} underlyingKey={effectiveKey} />;
}

function OptionsSnapshotLoader({ symbol, underlyingKey }: { symbol: string; underlyingKey: string }) {
  const { expiries, expiry, loading: expiriesLoading, error: expiriesError } = useOptionExpiries(underlyingKey);
  const { data: chain, loading: chainLoading, error: chainError } = useOptionChain(underlyingKey, expiry);

  if (expiriesLoading) {
    return (
      <Panel title="Options Positioning (F&O)" subtitle="Derivatives positioning and open interest distribution">
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-lg bg-muted/30" />
        </div>
      </Panel>
    );
  }

  // Ineligible or no active expiries: hide cleanly
  if (expiriesError || !expiries.length) {
    return null;
  }

  if (chainLoading && !chain) {
    return (
      <Panel title="Options Positioning (F&O)" subtitle={`Nearest expiry: ${expiry || "Loading…"}`}>
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-lg bg-muted/30" />
        </div>
      </Panel>
    );
  }

  if (chainError || !chain) {
    return (
      <Panel title="Options Positioning (F&O)" subtitle="Derivatives positioning and open interest distribution">
        <p className="text-sm text-muted-foreground">Option chain data is temporarily unavailable for {symbol}.</p>
      </Panel>
    );
  }

  const totalCallOi = chain.totalCallOi ?? 0;
  const totalPutOi = chain.totalPutOi ?? 0;
  const pcr = chain.pcr ?? (totalCallOi > 0 ? totalPutOi / totalCallOi : 0);
  const maxPain = chain.maxPain;
  const topCall = chain.topCallStrikes?.[0];
  const topPut = chain.topPutStrikes?.[0];

  // Neutral descriptive copy regarding PCR (Handbook P1: do not label PCR >= 1 categorically bearish)
  const pcrNote =
    pcr > 1.2
      ? `PCR of ${pcr.toFixed(2)} reflects higher put open interest relative to calls. Depending on spot momentum, an elevated PCR often indicates institutional put writing support rather than a directional short bias.`
      : pcr < 0.8
        ? `PCR of ${pcr.toFixed(2)} reflects heavy call open interest concentration relative to puts, signaling strong resistance or hedging around overhead call strikes.`
        : `PCR of ${pcr.toFixed(2)} indicates balanced open interest distribution between calls and puts for the ${expiry} series.`;

  const totalOi = totalCallOi + totalPutOi;
  const callPct = totalOi > 0 ? (totalCallOi / totalOi) * 100 : 50;
  const putPct = totalOi > 0 ? (totalPutOi / totalOi) * 100 : 50;

  return (
    <Panel
      title="Options Positioning (F&O)"
      subtitle={`Nearest contract series (${expiry}). Put-call open interest and max pain strike.`}
      action={
        <Link
          href={`/markets/derivatives?underlying=${encodeURIComponent(underlyingKey)}&expiry=${encodeURIComponent(expiry)}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Open full option chain & Greeks →
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Put-Call Ratio (PCR)</span>
            <p className="text-2xl font-bold tabular-nums text-foreground mt-1">{pcr.toFixed(2)}</p>
            <span className="text-xs text-muted-foreground">Total Put OI / Call OI</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Max Pain Strike</span>
            <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
              {maxPain != null ? fmtInr(maxPain) : "—"}
            </p>
            <span className="text-xs text-muted-foreground">Minimal option writer loss strike</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Call OI</span>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">{fmtNum(totalCallOi)}</p>
            <span className="text-xs text-muted-foreground">
              {topCall ? `Peak strike: ${fmtInr(topCall.strike)}` : "Across all strikes"}
            </span>
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Put OI</span>
            <p className="text-2xl font-bold tabular-nums text-rose-600 mt-1">{fmtNum(totalPutOi)}</p>
            <span className="text-xs text-muted-foreground">
              {topPut ? `Peak strike: ${fmtInr(topPut.strike)}` : "Across all strikes"}
            </span>
          </div>
        </div>

        {/* Visual Call vs Put OI ratio bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-medium">
            <span>Calls: {callPct.toFixed(1)}% ({fmtNum(totalCallOi)})</span>
            <span>Puts: {putPct.toFixed(1)}% ({fmtNum(totalPutOi)})</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40 flex">
            <div className="bg-emerald-500/80 transition-all duration-300" style={{ width: `${callPct}%` }} />
            <div className="bg-rose-500/80 transition-all duration-300" style={{ width: `${putPct}%` }} />
          </div>
        </div>

        {/* Neutral methodology note */}
        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
          {pcrNote}
        </p>
      </div>
    </Panel>
  );
}
