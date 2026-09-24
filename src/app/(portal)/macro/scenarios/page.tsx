"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import type { SectorImpact, Shocks } from "@/lib/transmission/scenario";
import { PRESETS } from "@/lib/transmission/scenario";
import { sectorFor } from "@/lib/transmission/sector-map";
import { useEffect, useMemo, useState } from "react";

type Resp = { impacts: SectorImpact[]; computedAt: string; window: [string, string]; method: string };
type Shock4 = Required<Shocks>;
const ZERO: Shock4 = { brent: 0, usdinr: 0, us10y_bp: 0, spx: 0 };
const FIELDS: { k: keyof Shock4; label: string; unit: string }[] = [
  { k: "brent", label: "Brent crude", unit: "%" },
  { k: "usdinr", label: "USD/INR", unit: "%" },
  { k: "us10y_bp", label: "US 10Y yield", unit: "bp" },
  { k: "spx", label: "S&P 500", unit: "%" },
];
const inputCls = "w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums text-foreground";

export default function ScenarioPage() {
  const [shocks, setShocks] = useState<Shock4>(ZERO);
  const [resp, setResp] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: pf } = useMyPortfolio(120_000);

  useEffect(() => {
    const active = Object.values(shocks).some((v) => v !== 0);
    if (!active) { setResp(null); setErr(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch("/api/scenario", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shocks }) });
      const json = await res.json();
      setLoading(false);
      if (!res.ok) { setErr(json.issues?.join("; ") ?? json.error ?? "Failed"); return; }
      setErr(null);
      setResp(json);
    }, 400);
    return () => clearTimeout(t);
  }, [shocks]);

  // Portfolio roll-up: Indian holdings via their sector proxy; US holdings assumed beta 1 to S&P plus the INR translation effect.
  const portfolio = useMemo(() => {
    if (!resp || !pf?.positions?.length) return null;
    const byId = new Map(resp.impacts.map((i) => [i.id, i]));
    let impact = 0, covered = 0;
    const rows = pf.positions.map((p) => {
      const pct = p.market === "US" ? shocks.spx + shocks.usdinr : byId.get(sectorFor(p.sector))?.impactPct ?? 0;
      impact += p.weight * pct;
      covered += p.weight;
      return { symbol: p.symbol, weight: p.weight, pct, basis: p.market === "US" ? "S&P β=1 + INR" : sectorFor(p.sector) };
    });
    return { rows: rows.sort((a, b) => a.pct * a.weight - b.pct * b.weight), impact: covered > 0 ? impact / covered : 0, nav: pf.navInr };
  }, [resp, pf, shocks]);

  const maxAbs = Math.max(0.5, ...(resp?.impacts.map((i) => Math.abs(i.impactPct)) ?? [0]));

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <PageHeader
        kicker="Scenario Engine"
        title="What If? Macro Shock Scenarios"
        subtitle="Apply a shock to crude, the rupee, US yields or the S&P 500 and see the model-implied same-day effect on each Indian sector and on your portfolio, using the measured betas from the Transmission Map."
      />

      <Panel title="Shocks">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" title={p.note} onClick={() => setShocks({ ...ZERO, ...p.shocks })} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent">
              {p.label}
            </button>
          ))}
          <button type="button" onClick={() => setShocks(ZERO)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:underline">Reset</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {FIELDS.map((f) => (
            <label key={f.k} className="inline-flex items-center gap-2 text-foreground">
              {f.label}
              <input className={inputCls} type="number" step="any" value={shocks[f.k]} onChange={(e) => setShocks({ ...shocks, [f.k]: Number(e.target.value) })} />
              <span className="text-muted-foreground">{f.unit}</span>
            </label>
          ))}
        </div>
        {err ? <p className="mt-2 text-sm text-rose-600">{err}</p> : null}
      </Panel>

      {loading && !resp ? <p className="text-sm text-muted-foreground">Computing…</p> : null}
      {!resp && !loading ? <p className="text-sm text-muted-foreground">Pick a preset or enter a shock to see the impact.</p> : null}

      {resp ? (
        <>
          <Panel title="Sector impact" subtitle="Model-implied same-day % move. Whisker text shows approximate ±1 standard error from beta estimation uncertainty.">
            <ul className="space-y-1.5 text-sm">
              {resp.impacts.map((i) => (
                <li key={i.id} className="grid grid-cols-[9rem_1fr_9rem] items-center gap-3">
                  <span className="text-foreground">{i.label}</span>
                  <div className="relative h-3 rounded bg-muted">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div className={`absolute inset-y-0 ${i.impactPct < 0 ? "right-1/2 bg-rose-500" : "left-1/2 bg-emerald-500"} rounded`} style={{ width: `${(Math.abs(i.impactPct) / maxAbs) * 50}%` }} />
                  </div>
                  <span className={`text-right tabular-nums ${i.impactPct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {i.impactPct >= 0 ? "+" : ""}{i.impactPct.toFixed(2)}% <span className="text-muted-foreground">±{i.seApproxPct.toFixed(2)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {portfolio ? (
            <Panel title="Your portfolio" subtitle="Weighted by current market value. Indian holdings use their sector's modelled impact (unmapped sectors use the NIFTY 50); US holdings assume beta 1 to the S&P 500 plus the rupee translation effect.">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                <span className={portfolio.impact < 0 ? "text-rose-600" : "text-emerald-600"}>{portfolio.impact >= 0 ? "+" : ""}{portfolio.impact.toFixed(2)}%</span>
                <span className="ml-2 text-sm font-normal text-muted-foreground">≈ ₹{Math.round((portfolio.impact / 100) * portfolio.nav).toLocaleString("en-IN")} on ₹{Math.round(portfolio.nav).toLocaleString("en-IN")}</span>
              </p>
              <ul className="mt-3 grid gap-x-8 text-sm sm:grid-cols-2">
                {portfolio.rows.map((r) => (
                  <li key={r.symbol} className="flex justify-between border-b border-border/40 py-1">
                    <span className="text-foreground">{r.symbol} <span className="text-muted-foreground">({(r.weight * 100).toFixed(1)}% · {r.basis})</span></span>
                    <span className={`tabular-nums ${r.pct < 0 ? "text-rose-600" : "text-emerald-600"}`}>{r.pct >= 0 ? "+" : ""}{r.pct.toFixed(2)}%</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {resp.method} Window {resp.window[0]} → {resp.window[1]}. Scenarios assume betas estimated on past daily moves hold, and larger or multi-day shocks can behave very differently. Research and education only — not investment advice.
          </p>
        </>
      ) : null}
    </div>
  );
}
