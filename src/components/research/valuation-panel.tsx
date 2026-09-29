"use client";

import { CompsPanel, QualityPanel } from "@/components/models/analysis-panels";
import { Panel } from "@/components/layout/page-header";
import { runScenarios, type ScenarioResult } from "@/lib/models/analysis";
import { buildModel } from "@/lib/models/dcf-engine";
import { formatByFmt } from "@/lib/models/format";
import type { FinancialDataset, ModelResult, Assumptions } from "@/lib/models/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ValuationPanelProps {
  symbol: string;
  livePrice?: number | null;
  liveAsOf?: string | null;
  /** Listing currency from live quote desk (INR for NSE, USD for US). */
  currency?: string;
  /** When true, model must align to NSE INR (not ADR). */
  indiaListing?: boolean;
}

type ValuationState =
  | { status: "loading" }
  | { status: "ready"; dataset: FinancialDataset; assumptions: Assumptions; model: ModelResult; scenarios: ScenarioResult }
  | { status: "unavailable"; reason: string };

const px = (v: number, ccy: string) => formatByFmt(v, "price", ccy);

export function ValuationPanel({
  symbol,
  livePrice,
  liveAsOf,
  currency = "INR",
  indiaListing = false,
}: ValuationPanelProps) {
  const [state, setState] = useState<ValuationState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    setState({ status: "loading" });

    async function load() {
      try {
        const res = await fetch(`/api/models/${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timer);
        if (!res.ok) {
          if (!cancelled) {
            setState({
              status: "unavailable",
              reason: "Automated DCF model is currently unavailable for this security.",
            });
          }
          return;
        }
        const json = await res.json();
        if (cancelled) return;

        if (!json.dataset || !json.assumptions) {
          setState({
            status: "unavailable",
            reason: "Insufficient financial statement data to compute intrinsic valuation.",
          });
          return;
        }

        const model = buildModel(json.dataset, json.assumptions);
        const scenarios = runScenarios(json.dataset, json.assumptions);

        setState({
          status: "ready",
          dataset: json.dataset,
          assumptions: json.assumptions,
          model,
          scenarios,
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "unavailable",
            reason: "Valuation model timed out or could not be built. Launch model builder below.",
          });
        }
      }
    }

    if (symbol) load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [symbol]);

  if (state.status === "loading") {
    return (
      <Panel title="Valuation & Intrinsic Value" subtitle="Automated DCF, scenario range, and peer multiples">
        <div className="space-y-4 animate-pulse">
          <div className="h-20 rounded-lg bg-muted/40" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="h-24 rounded-lg bg-muted/30" />
            <div className="h-24 rounded-lg bg-muted/30" />
            <div className="h-24 rounded-lg bg-muted/30" />
          </div>
        </div>
      </Panel>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Panel title="Valuation & Intrinsic Value" subtitle="Automated DCF, scenario range, and peer multiples">
        <div className="rounded-lg border border-border/60 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{state.reason}</p>
          <Link
            href={`/research/model/${encodeURIComponent(symbol)}`}
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            Open custom model builder →
          </Link>
        </div>
      </Panel>
    );
  }

  const { model, scenarios, dataset } = state;
  const modelCcy = dataset.profile.currency;
  const listingCcy = currency;
  const displayCcy = indiaListing ? "INR" : listingCcy || modelCcy;
  const modelRefPrice = model.dcf?.currentPrice ?? dataset.market.price;
  const canonicalPrice = livePrice != null && livePrice > 0 ? livePrice : modelRefPrice;
  const impliedPrice = scenarios.expectedPrice;
  const upside = canonicalPrice > 0 ? (impliedPrice / canonicalPrice - 1) * 100 : 0;
  const isUp = upside >= 0;

  const currencyMismatch =
    indiaListing &&
    modelCcy !== "INR" &&
    livePrice != null &&
    livePrice > 0;

  // P0 Valuation quote reconciliation: check divergence between live quote and model dataset price
  const priceDiffPct =
    !currencyMismatch &&
    livePrice != null &&
    modelRefPrice > 0
      ? Math.abs((livePrice - modelRefPrice) / modelRefPrice) * 100
      : 0;

  return (
    <Panel
      title="Valuation & Intrinsic Value"
      subtitle="Automated DCF projection, scenario probability weighting, and peer multiples."
      action={
        <Link
          href={`/research/model/${encodeURIComponent(symbol)}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Edit assumptions in full model →
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Core Valuation Metric Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Implied Value (DCF)</span>
            <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">{px(impliedPrice, modelCcy)}</p>
            <span className="text-xs text-muted-foreground">Probability-weighted scenario</span>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">vs Reference Price</span>
            <p className={cn("text-2xl font-bold tabular-nums mt-0.5", isUp ? "text-emerald-600" : "text-rose-600")}>
              {isUp ? "+" : ""}{upside.toFixed(1)}%
            </p>
            <span className="text-xs text-muted-foreground">
              Based on {livePrice != null ? "live Upstox tick" : "model dataset"}
            </span>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Base Case Value</span>
            <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
              {px(scenarios.scenarios.find((s) => s.name === "Base")?.price ?? model.dcf?.impliedPrice ?? impliedPrice, modelCcy)}
            </p>
            <span className="text-xs text-muted-foreground">WACC {formatByFmt(model.wacc.wacc, "pct2")}</span>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Valuation Method</span>
            <p className="text-lg font-semibold text-foreground mt-1 capitalize">{model.method.toUpperCase()} DCF</p>
            <span className="text-xs text-muted-foreground">{model.dcf?.years?.length ?? 5}-year forecast period</span>
          </div>
        </div>

        {/* P0 Quote reconciliation banner if timestamps or providers diverge */}
        {currencyMismatch ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
            <strong>Currency mismatch:</strong> Live NSE quote is in INR ({px(livePrice!, "INR")}) but the financial model loaded in {modelCcy}. Refresh after deploy or open the full model — India names should use Yahoo <code className="text-[11px]">{symbol}.NS</code>, not the US ADR ticker.
          </div>
        ) : null}

        {priceDiffPct > 1.5 && livePrice != null ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <span>
              <strong>Quote timing note:</strong> Live price is {px(livePrice, displayCcy)} (Upstox{liveAsOf ? ` as of ${liveAsOf}` : ""}), while financial model statements reference {px(modelRefPrice, modelCcy)} ({priceDiffPct.toFixed(1)}% delta). Implied upside is calculated against the live quote.
            </span>
          </div>
        ) : null}

        {/* Scenario Analysis Range */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Scenario Analysis</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scenarios.scenarios.map((s) => {
              const sUpside = (s.price / canonicalPrice - 1) * 100;
              const sUp = sUpside >= 0;
              return (
                <div key={s.name} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{s.name} Case</span>
                    <span className="text-xs font-medium text-muted-foreground">{(s.probability * 100).toFixed(0)}% prob</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-1">{px(s.price, modelCcy)}</p>
                  <p className={cn("text-xs font-medium tabular-nums mt-0.5", sUp ? "text-emerald-600" : "text-rose-600")}>
                    {sUp ? "+" : ""}{sUpside.toFixed(1)}% vs price
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peer Comps Summary */}
        {dataset.peers ? (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Peer Valuation Multiples</h4>
            <CompsPanel peers={dataset.peers} model={model} />
          </div>
        ) : null}

        {/* Quality Flags & Disclaimers */}
        {model.quality && model.quality.length > 0 ? (
          <div className="rounded-lg border border-border/50 bg-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Model Quality Diagnostics</h4>
            <QualityPanel flags={model.quality} />
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
          Starting point, not investment advice. Intrinsic value is an automated model projection derived from reported cash flows, discount rates, and peer sets. Open the full model builder to inspect or customize forward assumptions.
        </p>
      </div>
    </Panel>
  );
}
