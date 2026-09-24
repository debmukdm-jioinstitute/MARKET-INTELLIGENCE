"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import type { BacktestResult } from "@/lib/stress/backtest";
import Link from "next/link";
import useSWR from "swr";

const fetcher = async (url: string): Promise<BacktestResult> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};
const pct = (v: number, d = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`;
const share = (v: number) => `${(v * 100).toFixed(0)}%`;

export default function StressBacktestPage() {
  const { data: b, error, isLoading } = useSWR("/api/stress/backtest", fetcher);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-16">
      <PageHeader
        kicker="Model Check"
        title="Does the Stress Index Predict Anything?"
        subtitle="A historical test of the stress index's market-based inputs against what NIFTY did over the following 5–10 trading days. It is published whichever way the answer comes out."
      />
      <Link href="/macro/stress" className="text-sm text-blue-600 hover:underline">← Back to the Stress Index</Link>
      {isLoading ? <p className="text-sm text-muted-foreground">Running the backtest… (about 10 seconds the first time)</p> : null}
      {error ? <p className="text-sm text-rose-600">Unavailable: {error.message}</p> : null}

      {b ? (
        <>
          <Panel title="Result">
            <p className="text-sm text-foreground">{b.verdict}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {b.days.toLocaleString()} trading days, {b.window[0]} → {b.window[1]}. Correlation of stress score with the next 5-day NIFTY return: {b.correlationFwd5.toFixed(2)} (near 0 = no linear relationship).
            </p>
          </Panel>

          <Panel title="Forward NIFTY outcomes by stress band" subtitle="Outcomes are measured strictly after the signal day.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Band</th>
                    <th className="py-2 pr-4 text-right font-semibold">Days</th>
                    <th className="py-2 pr-4 text-right font-semibold">Avg next-5d</th>
                    <th className="py-2 pr-4 text-right font-semibold">Median next-5d</th>
                    <th className="py-2 pr-4 text-right font-semibold">Chance of ≥2% drop</th>
                    <th className="py-2 text-right font-semibold">Avg worst 10d drawdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 tabular-nums">
                  {b.buckets.map((r) => (
                    <tr key={r.bucket}>
                      <td className="py-2 pr-4 capitalize text-foreground">{r.bucket}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{r.days}</td>
                      <td className="py-2 pr-4 text-right">{pct(r.meanFwd5)}</td>
                      <td className="py-2 pr-4 text-right">{pct(r.medianFwd5)}</td>
                      <td className="py-2 pr-4 text-right">{share(r.probDrop2pct)}</td>
                      <td className="py-2 text-right">{pct(r.meanMaxDd10)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2 pr-4 text-foreground">All days</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{b.days}</td>
                    <td className="py-2 pr-4 text-right">{pct(b.baseline.meanFwd5)}</td>
                    <td className="py-2 pr-4 text-right">—</td>
                    <td className="py-2 pr-4 text-right">{share(b.baseline.probDrop2pct)}</td>
                    <td className="py-2 text-right">{pct(b.baseline.meanMaxDd10)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Bands with only a handful of days (high, extreme) are anecdotes, not statistics.</p>
          </Panel>

          <Panel title="Convergence (3+ families stressed together)">
            <p className="text-sm text-foreground">
              {b.convergence.days} days ({b.convergence.nonOverlappingEvents} distinct episodes): average next-5d NIFTY return {pct(b.convergence.meanFwd5)}; chance of a ≥2% drop {share(b.convergence.probDrop2pct)} (baseline {share(b.baseline.probDrop2pct)}).
              With so few episodes this is not enough to say convergence alerts add information.
            </p>
          </Panel>

          <Panel title="Caveats">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {b.caveats.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Inputs tested: {b.inputs.join(", ")}.</p>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
