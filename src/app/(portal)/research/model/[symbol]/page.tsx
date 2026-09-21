"use client";

import { AssumptionsEditor } from "@/components/models/assumptions-editor";
import { ModelSummaryCards } from "@/components/models/model-summary-cards";
import { ProjectionTable } from "@/components/models/projection-table";
import { SensitivityGrid } from "@/components/models/sensitivity-grid";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { applyOverrides } from "@/lib/models/assumptions";
import { buildModel } from "@/lib/models/dcf-engine";
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
    <div className="space-y-6">
      <PageHeader
        kicker="Financial model"
        title={dataset ? `${dataset.profile.name} · ${dataset.profile.symbol}` : symbol}
        subtitle="Free-cash-flow DCF valuation built from Yahoo Finance annual statements — CAPM cost of equity, unlevered FCF, dual terminal-value cross-check."
      />
      <p className="text-xs text-muted-foreground">
        <Link href={`/research/${encodeURIComponent(symbol)}`} className="text-primary hover:underline">
          ← Back to {symbol} research
        </Link>
        {dataset ? ` · Source: ${dataset.source}, retrieved ${new Date(dataset.retrievedAt).toLocaleString()}` : null}
      </p>

      {loading ? <p className="text-sm text-muted-foreground">Building model…</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {model ? (
        <>
          <ModelSummaryCards model={model} />

          {dataset!.notes.length ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200/90 space-y-1">
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
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
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

              <Panel title="DCF valuation bridge" subtitle="Enterprise value → equity value → implied price per share">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs sm:grid-cols-3">
                  {[
                    ["Sum of PV of FCFF", model.dcf.sumPv],
                    ["PV of terminal value", model.dcf.pvTv],
                    ["Enterprise value", model.dcf.enterpriseValue],
                    ["Less: total debt", model.dcf.lessDebt],
                    ["Plus: cash & ST investments", model.dcf.plusCash],
                    ["Equity value", model.dcf.equityValue],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="tabular-nums text-foreground">{(value as number).toLocaleString("en-US", { maximumFractionDigits: 0 })}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>

              <Panel title="Sensitivity" subtitle="Implied share price across WACC and terminal-value assumptions">
                <div className="space-y-6">
                  <SensitivityGrid table={model.sensitivityGordon} rowFmt="pct2" currency={currency} />
                  <SensitivityGrid table={model.sensitivityExit} rowFmt="mult" currency={currency} />
                </div>
              </Panel>

              <Panel title="Model integrity checks">
                <ul className="space-y-1.5 text-xs">
                  {model.checks.map((c) => (
                    <li key={c.label} className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className={c.pass ? "text-emerald-400" : "text-amber-400"}>
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
    </div>
  );
}
