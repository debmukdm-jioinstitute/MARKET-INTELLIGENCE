"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import {
  estimateIndiaPortfolioTax,
  INDIA_TAX_RATES,
} from "@/lib/my-portfolio/india-tax-estimate";
import { formatInr, formatPct } from "@/lib/format";
import useSWR from "swr";
import type { TradeLogRow } from "@/lib/my-portfolio/types";
import Link from "next/link";
import { useMemo } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as { trades: TradeLogRow[] };
};

export default function PortfolioTaxPage() {
  const { data, loading, error, locked, holdings } = useMyPortfolio();
  const { data: tradePayload } = useSWR(locked ? null : "/api/portfolio/trades", fetcher);

  const summary = useMemo(() => {
    if (!data?.hasHoldings) return null;
    const addedAtBySymbol = new Map(holdings.map((h) => [h.symbol.toUpperCase(), h.addedAt]));
    const avgCostBySymbol = new Map(holdings.map((h) => [h.symbol.toUpperCase(), h.avgCost]));
    return estimateIndiaPortfolioTax({
      positions: data.positions,
      tradeLog: tradePayload?.trades ?? [],
      avgCostBySymbol,
      addedAtBySymbol,
      fxRate: 87,
    });
  }, [data, holdings, tradePayload?.trades]);

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Tax"
        title="Capital gains estimate (India)"
        subtitle="Illustrative STCG/LTCG math on your book — not tax advice. Confirm with a CA."
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {locked ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/login?next=/portfolio/tax" className="font-semibold text-blue-600 hover:underline">
            Log in
          </Link>{" "}
          to see estimates on your holdings.
        </p>
      ) : null}

      {!locked && data && !data.hasHoldings ? (
        <p className="text-sm text-muted-foreground">
          Add holdings on{" "}
          <Link href="/portfolio" className="font-semibold text-blue-600 hover:underline">
            Portfolio
          </Link>{" "}
          first.
        </p>
      ) : null}

      {summary ? (
        <>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            Rates used: STCG {formatPct(INDIA_TAX_RATES.stcgRate, 0, false)} on equity gains ≤{" "}
            {INDIA_TAX_RATES.ltcgHoldingDays} days; LTCG {formatPct(INDIA_TAX_RATES.ltcgRate, 1, false)} above{" "}
            {formatInr(INDIA_TAX_RATES.ltcgAnnualExemptionInr)} exemption. Holding period from your `addedAt` date
            (not full FIFO). US names shown for P&L only — no US tax calc here.
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Est. STCG tax</p>
              <p className="text-xl font-semibold tabular-nums">{formatInr(summary.estimatedStcgTaxInr)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Est. LTCG tax</p>
              <p className="text-xl font-semibold tabular-nums">{formatInr(summary.estimatedLtcgTaxInr)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">LTCG exemption used</p>
              <p className="text-xl font-semibold tabular-nums">{formatInr(summary.ltcgExemptionAppliedInr)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Total est. tax</p>
              <p className="text-xl font-semibold tabular-nums">{formatInr(summary.totalEstimatedTaxInr)}</p>
            </div>
          </div>

          <Panel title="Unrealized by bucket" subtitle="Open positions">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Bucket</th>
                    <th className="py-2 pr-3 text-right">Days</th>
                    <th className="py-2 text-right">Gain (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.unrealizedRows.map((r) => (
                    <tr key={r.symbol} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{r.symbol}</td>
                      <td className="py-2 pr-3">{r.bucket}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.holdingDays}</td>
                      <td className="py-2 text-right tabular-nums">{formatInr(r.gainInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {summary.realizedRows.length > 0 ? (
            <div className="mt-4">
            <Panel title="Realized sells" subtitle="From trade log">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Symbol</th>
                      <th className="py-2 pr-3 text-right">Shares</th>
                      <th className="py-2 text-right">Gain (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.realizedRows.map((r, i) => (
                      <tr key={`${r.symbol}-${r.tradeDate}-${i}`} className="border-b border-border/60">
                        <td className="py-2 pr-3">{r.tradeDate}</td>
                        <td className="py-2 pr-3">{r.symbol}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.shares}</td>
                        <td className="py-2 text-right tabular-nums">{formatInr(r.gainInr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
