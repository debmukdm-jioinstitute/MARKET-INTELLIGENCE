"use client";

import {
  BridgePanel,
  CompsPanel,
  FootballField,
  GrowthMarginTable,
  MonteCarloPanel,
  QualityPanel,
  ReversePanel,
  RiPanel,
  ScenarioPanel,
  TerminalPanel,
  TornadoChart,
} from "@/components/models/analysis-panels";
import { AssumptionsEditor } from "@/components/models/assumptions-editor";
import { ModelSummaryCards } from "@/components/models/model-summary-cards";
import { ProjectionTable } from "@/components/models/projection-table";
import { SensitivityGrid } from "@/components/models/sensitivity-grid";
import { ProwessReportSections } from "@/components/research/prowess-report-sections";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { footballField, growthMarginGrid, reverseDcf, runMonteCarlo, runScenarios, runTornado, type MonteCarloResult } from "@/lib/models/analysis";
import { applyOverrides, ASSUMPTION_SPECS, deriveAssumptions } from "@/lib/models/assumptions";
import { buildModel } from "@/lib/models/dcf-engine";
import { formatByFmt } from "@/lib/models/format";
import type { Assumptions, FinancialDataset, ModelResult } from "@/lib/models/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function FinancialModelPage() {
  const params = useParams();
  const symbol = decodeURIComponent(String(params.symbol ?? "")).toUpperCase();

  const [dataset, setDataset] = useState<FinancialDataset | null>(null);
  const [defaultAssumptions, setDefaultAssumptions] = useState<Assumptions | null>(null);
  const [assumptions, setAssumptions] = useState<Assumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mc, setMc] = useState<MonteCarloResult | null>(null);
  const [mcRunning, setMcRunning] = useState(false);
  const [lookback, setLookback] = useState(3);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/models/${encodeURIComponent(symbol)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          setDataset(json.dataset);
          setDefaultAssumptions(json.assumptions);
          setAssumptions(json.assumptions);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to build financial model");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (symbol) load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const model: ModelResult | null = useMemo(() => {
    if (!dataset || !assumptions) return null;
    try {
      return buildModel(dataset, assumptions);
    } catch {
      return null;
    }
  }, [dataset, assumptions]);

  const isFcff = model?.method === "fcff";
  const scenarios = useMemo(() => (dataset && assumptions ? runScenarios(dataset, assumptions) : null), [dataset, assumptions]);
  const tornado = useMemo(() => (dataset && assumptions && isFcff ? runTornado(dataset, assumptions) : null), [dataset, assumptions, isFcff]);
  const grid = useMemo(() => (dataset && assumptions && isFcff ? growthMarginGrid(dataset, assumptions) : null), [dataset, assumptions, isFcff]);
  const reverse = useMemo(() => (dataset && assumptions && isFcff ? reverseDcf(dataset, assumptions) : null), [dataset, assumptions, isFcff]);
  const football = useMemo(() => (model && scenarios ? footballField(model, scenarios, mc) : []), [model, scenarios, mc]);

  // Monte Carlo is the one expensive analysis: run it on demand, and discard it when assumptions change.
  useEffect(() => {
    setMc(null);
  }, [assumptions]);

  function runMc() {
    if (!dataset || !assumptions) return;
    setMcRunning(true);
    setTimeout(() => {
      setMc(runMonteCarlo(dataset, assumptions, 1500));
      setMcRunning(false);
    }, 20);
  }

  function applyLookback(years: number) {
    if (!dataset) return;
    setLookback(years);
    const fresh = deriveAssumptions(dataset, assumptions?.years ?? 5, years);
    setDefaultAssumptions(fresh);
    setAssumptions(fresh);
  }

  async function exportXlsx() {
    if (!assumptions) return;
    setExporting(true);
    try {
      const overrides: Record<string, number | number[]> = {};
      for (const k of assumptions.overridden) overrides[k] = assumptions.values[k];
      const res = await fetch(`/api/models/${encodeURIComponent(symbol)}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ years: assumptions.years, lookback, overrides }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${symbol}-valuation-model.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const changes = useMemo(() => {
    if (!assumptions || !defaultAssumptions) return [];
    return ASSUMPTION_SPECS.filter((sp) => assumptions.values[sp.key] != null && JSON.stringify(assumptions.values[sp.key]) !== JSON.stringify(defaultAssumptions.values[sp.key])).map((sp) => ({
      label: sp.label,
      from: defaultAssumptions.values[sp.key],
      to: assumptions.values[sp.key],
      fmt: sp.fmt,
    }));
  }, [assumptions, defaultAssumptions]);

  function handleAssumptionChange(key: string, value: number) {
    if (!assumptions) return;
    try {
      setAssumptions(applyOverrides(assumptions, { [key]: value }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid assumption value");
    }
  }

  function resetAssumptions() {
    if (defaultAssumptions) setAssumptions(defaultAssumptions);
  }

  const currency = dataset?.profile.currency ?? "USD";

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Financial model"
        title={dataset ? `${dataset.profile.name} · ${dataset.profile.symbol}` : symbol}
        subtitle="Free-cash-flow DCF (residual income for banks and insurers) built from Yahoo Finance statements — bottom-up beta, local-currency CAPM, normalised terminal value, full equity bridge, scenarios and Monte Carlo."
      />
      <p className="text-sm text-muted-foreground">
        <Link href={`/research/${encodeURIComponent(symbol)}`} className="text-primary hover:underline">
          ← Back to {symbol} research
        </Link>
        {dataset ? ` · Source: ${dataset.source}, retrieved ${new Date(dataset.retrievedAt).toLocaleString()}` : null}
      </p>

      {loading ? <p className="text-sm text-muted-foreground">Building model…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {model ? (
        <>
          {model.checks.some((c) => !c.pass) ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-3 text-sm text-muted-foreground space-y-1.5">
              <p className="font-semibold text-rose-600">
                {model.checks.filter((c) => !c.pass).length} model integrity check
                {model.checks.filter((c) => !c.pass).length > 1 ? "s" : ""} flagged — treat the valuation below with caution.
              </p>
              {model.checks
                .filter((c) => !c.pass)
                .map((c) => (
                  <p key={c.label}>
                    <span className="font-medium text-foreground">{c.label}</span> ({c.value}): {c.why}
                  </p>
                ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-blue-600/15 px-2 py-0.5 font-semibold text-blue-600">
              {isFcff ? "Method: unlevered FCF DCF" : "Method: residual income (financial company)"}
            </span>
            <button
              type="button"
              onClick={() => applyLookback(lookback === 6 ? 3 : 6)}
              className="rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Re-derives every historical average over 6 years instead of 3 — use for cyclicals to capture mid-cycle margins. Resets edits."
            >
              {lookback === 6 ? "Using 6-yr mid-cycle averages — switch to 3-yr" : "Use 6-yr mid-cycle averages (cyclicals)"}
            </button>
            <button
              type="button"
              onClick={exportXlsx}
              disabled={exporting}
              className="rounded-md border border-border px-2.5 py-1 text-foreground hover:bg-accent disabled:opacity-50"
            >
              {exporting ? "Building workbook…" : "Export to Excel (live formulas)"}
            </button>
          </div>

          <ModelSummaryCards model={model} />

          {model.quality.length ? (
            <Panel title="Data-quality screen" subtitle="Things that can make the base year unrepresentative — review before relying on the output">
              <QualityPanel flags={model.quality} />
            </Panel>
          ) : null}

          {dataset!.notes.length ? (
            <div className="rounded-lg border border-blue-600/30 bg-blue-600/5 p-3 text-sm text-blue-600/90 space-y-1">
              {dataset!.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Assumptions" subtitle="Every default is derived from history; edit any figure to recompute instantly." className="xl:col-span-1">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={resetAssumptions}
                  className="rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Reset to defaults
                </button>
              </div>
              <AssumptionsEditor assumptions={model.assumptions} currency={currency} onChange={handleAssumptionChange} />
            </Panel>

            <div className="space-y-4 xl:col-span-2">
              <Panel title="Projection" subtitle={`${model.dcf.years.length}-year explicit forecast, ${currency} millions`}>
                <ProjectionTable years={model.dcf.years} currency={currency} />
              </Panel>

              {isFcff ? (
                <>
                  <Panel title="DCF valuation bridge" subtitle="Enterprise value → equity value → implied price per diluted share">
                    <BridgePanel model={model} />
                  </Panel>
                  <Panel title="Terminal value (normalised)" subtitle="Year N+1 NOPAT at the marginal tax rate; reinvestment = g / ROIC so growth is never free">
                    <TerminalPanel model={model} />
                  </Panel>
                </>
              ) : (
                <Panel title="Residual-income valuation" subtitle="Equity value = book value + PV of excess returns">
                  <RiPanel model={model} />
                </Panel>
              )}

              <Panel title="Sensitivity" subtitle="Implied share price across WACC and terminal-value assumptions">
                <div className="portal-page">
                  {isFcff ? (
                    <>
                      <SensitivityGrid table={model.sensitivityGordon} rowFmt="pct2" currency={currency} />
                      <SensitivityGrid table={model.sensitivityExit} rowFmt="mult" currency={currency} />
                      {grid ? <GrowthMarginTable grid={grid} currency={currency} /> : null}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Cost-of-equity and ROE sensitivities are covered by the scenarios and Monte Carlo below.</p>
                  )}
                </div>
              </Panel>

              {scenarios ? (
                <Panel title="Scenarios" subtitle="Bear / base / bull with probability-weighted value">
                  <ScenarioPanel result={scenarios} currency={currency} />
                </Panel>
              ) : null}

              <Panel title="Monte Carlo simulation" subtitle="Distribution of implied value under joint uncertainty in growth, margin, WACC and terminal growth">
                {mc ? (
                  <MonteCarloPanel result={mc} currency={currency} currentPrice={model.dcf.currentPrice} />
                ) : (
                  <button
                    type="button"
                    onClick={runMc}
                    disabled={mcRunning}
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-50"
                  >
                    {mcRunning ? "Simulating 1,500 draws…" : "Run Monte Carlo (1,500 draws)"}
                  </button>
                )}
              </Panel>

              {tornado ? (
                <Panel title="Value drivers (tornado)" subtitle="Which assumptions move the price most">
                  <TornadoChart basePrice={tornado.basePrice} bars={tornado.bars} currency={currency} />
                </Panel>
              ) : null}

              {reverse ? (
                <Panel title="Reverse DCF" subtitle="What the market price implies">
                  <ReversePanel result={reverse} currency={currency} />
                </Panel>
              ) : null}

              {football.length ? (
                <Panel title="Valuation summary (football field)" subtitle="Intrinsic value against trading comps and the 52-week range">
                  <FootballField bars={football} currentPrice={model.dcf.currentPrice} currency={currency} />
                </Panel>
              ) : null}

              {dataset!.peers ? (
                <Panel title="Peer comparables" subtitle="Trading multiples and bottom-up beta inputs">
                  <CompsPanel peers={dataset!.peers} model={model} />
                </Panel>
              ) : null}

              <Panel title="Assumption change log" subtitle="Edits against the values derived from the company's own history">
                {changes.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {changes.map((c) => (
                      <li key={c.label} className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="tabular-nums text-foreground">
                          {Array.isArray(c.from) ? "vector" : formatByFmt(c.from as number, c.fmt)} → {Array.isArray(c.to) ? "vector" : formatByFmt(c.to as number, c.fmt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No edits — every assumption is the derived default.</p>
                )}
              </Panel>

              <Panel title="Model integrity checks">
                <ul className="space-y-1.5 text-sm">
                  {model.checks.map((c) => (
                    <li key={c.label} className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className={c.pass ? "text-emerald-600" : "text-blue-600"}>
                        {c.pass ? "PASS" : "FLAG"} · {c.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </>
      ) : null}

      {symbol ? <ProwessReportSections company={symbol} /> : null}
    </div>
  );
}
