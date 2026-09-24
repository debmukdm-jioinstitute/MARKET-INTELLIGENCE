"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import type { BetaPayload } from "@/lib/transmission/betas";
import type { SectorImpact, Shocks } from "@/lib/transmission/scenario";
import useSWR from "swr";

type Payload = { betas: BetaPayload; today: { shocks: Shocks; implied: SectorImpact[] } | null };
const fetcher = async (url: string): Promise<Payload> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

function cellTone(beta: number, t: number) {
  if (Math.abs(t) < 2) return "text-muted-foreground/60";
  return beta > 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold";
}

export default function TransmissionPage() {
  const { data, error, isLoading } = useSWR("/api/transmission", fetcher, { refreshInterval: 300_000 });
  const b = data?.betas;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      <PageHeader
        kicker="Transmission Map"
        title="How Global Moves Reach Indian Sectors"
        subtitle="Measured sensitivities of each sector to crude oil, the rupee, US yields and the S&P 500, estimated from about two years of daily returns. Numbers in bold are statistically significant (|t| ≥ 2); faded numbers are indistinguishable from noise."
      />
      {isLoading ? <p className="text-sm text-muted-foreground">Estimating from price history… (first load can take ~10 seconds)</p> : null}
      {error ? <p className="text-sm text-rose-600">Unavailable: {error.message}</p> : null}

      {b ? (
        <>
          <Panel title="Sector × factor betas" subtitle={`Window ${b.windowStart} → ${b.windowEnd} · updated ${new Date(b.computedAt).toLocaleString()}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Sector</th>
                    {b.factors.map((f) => (
                      <th key={f.id} className="py-2 pr-4 text-right font-semibold">
                        {f.label}
                        <div className="text-[10px] font-normal normal-case">{f.unit}</div>
                      </th>
                    ))}
                    <th className="py-2 pr-2 text-right font-semibold">R²</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {b.sectors.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-4 text-foreground">{s.label}</td>
                      {b.factors.map((f) => {
                        const c = s.betas[f.id];
                        return (
                          <td key={f.id} className={`py-2 pr-4 text-right tabular-nums ${cellTone(c.beta, c.t)}`} title={`t = ${c.t.toFixed(1)}, se = ${c.se.toFixed(3)}`}>
                            {c.beta >= 0 ? "+" : ""}{c.beta.toFixed(2)}
                          </td>
                        );
                      })}
                      <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">{s.r2.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Read: a beta of −0.60 on USD/INR means a sector has tended to fall about 0.6% when the rupee weakens 1%, holding the other factors fixed. Low R² is normal for daily data — these factors explain a small share of any day&apos;s move.
            </p>
          </Panel>

          {data.today ? (
            <Panel title="If today's global moves fully transmit" subtitle="Today's observed factor moves multiplied by the betas — a model-implied nudge, not a forecast of the actual close.">
              <p className="mb-3 text-sm text-muted-foreground">
                Brent {data.today.shocks.brent?.toFixed(2) ?? "n/a"}% · USD/INR {data.today.shocks.usdinr?.toFixed(2) ?? "n/a"}% · US 10Y {data.today.shocks.us10y_bp?.toFixed(0) ?? "n/a"}bp · S&amp;P 500 {data.today.shocks.spx?.toFixed(2) ?? "n/a"}%
              </p>
              <ul className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                {[...data.today.implied].sort((x, y) => x.impactPct - y.impactPct).map((i) => (
                  <li key={i.id} className="flex justify-between border-b border-border/40 py-1">
                    <span className="text-foreground">{i.label}</span>
                    <span className={`tabular-nums ${i.impactPct < 0 ? "text-rose-600" : "text-emerald-600"}`}>{i.impactPct >= 0 ? "+" : ""}{i.impactPct.toFixed(2)}%</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <p className="text-xs text-muted-foreground">{b.method} Sector series are index-tracking ETFs, so they include small tracking noise. Research and education only — not investment advice.</p>
        </>
      ) : null}
    </div>
  );
}
