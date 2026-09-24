"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import type { AlertRow, StressPoint } from "@/lib/stress/store";
import type { StressResult } from "@/lib/stress/compute";
import { AlertTriangle } from "lucide-react";
import useSWR from "swr";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Payload = { current: StressResult; history: StressPoint[]; alerts: AlertRow[] };

const fetcher = async (url: string): Promise<Payload> => {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

const BAND_STYLE: Record<StressResult["band"], { label: string; text: string; bar: string }> = {
  calm: { label: "Calm", text: "text-emerald-600", bar: "bg-emerald-500" },
  normal: { label: "Normal", text: "text-sky-600", bar: "bg-sky-500" },
  elevated: { label: "Elevated", text: "text-amber-600", bar: "bg-amber-500" },
  high: { label: "High", text: "text-orange-600", bar: "bg-orange-500" },
  extreme: { label: "Extreme", text: "text-rose-600", bar: "bg-rose-600" },
  unavailable: { label: "Unavailable", text: "text-muted-foreground", bar: "bg-muted" },
};

const barTone = (s: number) => (s >= 80 ? "bg-rose-600" : s >= 65 ? "bg-orange-500" : s >= 45 ? "bg-amber-500" : s >= 25 ? "bg-sky-500" : "bg-emerald-500");

export default function StressIndexPage() {
  const { data, error, isLoading } = useSWR("/api/stress", fetcher, { refreshInterval: 60_000 });
  const cur = data?.current;
  const band = cur ? BAND_STYLE[cur.band] : null;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Risk Radar"
        title="India Macro Stress Index"
        subtitle="A 0–100 read of market stress built from volatility, currency, rates, oil, capital flows and price action — plus a convergence alert when several independent signals stress at once."
      />

      {isLoading ? <p className="text-sm text-muted-foreground">Computing from live feeds…</p> : null}
      {error ? <p className="text-sm text-rose-600">Stress index unavailable: {error.message}</p> : null}

      {cur && band ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stress score</p>
              <p className={`mt-1 text-5xl font-bold tabular-nums ${band.text}`}>{cur.score ?? "—"}</p>
              <p className={`text-sm font-semibold ${band.text}`}>{band.label}</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${band.bar}`} style={{ width: `${cur.score ?? 0}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>0 calm</span><span>45 elevated</span><span>80+ extreme</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">As of {new Date(cur.asOf).toLocaleString()}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Signal families</p>
                <p className="text-xs text-muted-foreground">A family fires at ≥ 60</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cur.families.map((f) => (
                  <div key={f.id} className={`rounded-lg border p-3 ${f.firing ? "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20" : "border-border"}`}>
                    <p className="text-sm font-semibold text-foreground">{f.label}</p>
                    <p className="text-xl font-bold tabular-nums text-foreground">{Math.round(f.score)}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${barTone(f.score)}`} style={{ width: `${f.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {cur.convergence.priority !== "none" ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50/60 p-3 text-sm dark:bg-rose-950/20">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                  <p className="text-foreground">
                    <span className="font-bold uppercase">{cur.convergence.priority} convergence</span> — {cur.convergence.firing.length} independent
                    families are stressed together (score {cur.convergence.score}).
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No convergence: {cur.convergence.firing.length} of {cur.families.length} families stressed (alert needs 3+).
                </p>
              )}
            </div>
          </div>

          <Panel title="Components" subtitle="Each input is mapped from a calm level (0) to a stressed level (100). Weights are re-normalised over the inputs currently available.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Input</th>
                    <th className="py-2 pr-4 font-semibold">Family</th>
                    <th className="py-2 pr-4 text-right font-semibold">Reading</th>
                    <th className="py-2 pr-4 text-right font-semibold">Weight</th>
                    <th className="w-48 py-2 font-semibold">Stress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {cur.components.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-4 text-foreground">{c.label}</td>
                      <td className="py-2 pr-4 capitalize text-muted-foreground">{c.family}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-foreground">{c.display}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{(c.weight * 100).toFixed(0)}%</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full ${barTone(c.score)}`} style={{ width: `${c.score}%` }} />
                          </div>
                          <span className="w-8 tabular-nums text-muted-foreground">{Math.round(c.score)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="30-day history" subtitle="Snapshots are stored every 3 hours; the chart fills in as data accumulates.">
            {data.history.length > 1 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.history.map((p) => ({ ...p, label: new Date(p.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" name="Stress" stroke="#e11d48" fill="#e11d48" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough history yet — the scheduled job records a point every 3 hours.</p>
            )}
          </Panel>

          <Panel title="Convergence alerts" subtitle="Fired only when 3+ independent families are stressed together; de-duplicated (12h) and capped at 4 per day.">
            {data.alerts.length ? (
              <ul className="divide-y divide-border/50 text-sm">
                {data.alerts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                    <span className={`font-bold uppercase ${a.priority === "critical" ? "text-rose-600" : "text-orange-600"}`}>{a.priority}</span>
                    <span className="tabular-nums text-muted-foreground">{new Date(a.fired_at).toLocaleString()}</span>
                    <span className="text-foreground">{a.families.join(" + ")}</span>
                    <span className="tabular-nums text-muted-foreground">score {a.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No alerts recorded.</p>
            )}
          </Panel>

          <p className="text-xs text-muted-foreground">
            Methodology: a hand-weighted heuristic, not a fitted or backtested model. Bands: &lt;25 calm · 25–45 normal · 45–65 elevated · 65–80 high · 80+ extreme.
            Convergence score = 25 × families stressed + a small intensity boost. Research and education only — not investment advice.
          </p>
        </>
      ) : null}
    </div>
  );
}
