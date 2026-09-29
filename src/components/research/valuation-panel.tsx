"use client";

import { useState, useEffect } from "react";
import { CompsPanel, QualityPanel } from "@/components/models/analysis-panels";
import { Panel } from "@/components/layout/page-header";
import { buildModel } from "@/lib/models/dcf-engine";
import { applyOverrides } from "@/lib/models/assumptions";
import { formatByFmt } from "@/lib/models/format";
import type { FinancialDataset, Assumptions, ModelResult } from "@/lib/models/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Calculator,
  Sliders,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react";

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
  | { status: "ready"; dataset: FinancialDataset; baseAssumptions: Assumptions; baseModel: ModelResult }
  | { status: "unavailable"; reason: string };

interface UserInputs {
  revenueGrowthPct: string;
  ebitMarginPct: string;
  waccPct: string;
  terminalGrowthPct: string;
  projectionYears: number;
}

interface CalculatedValuation {
  impliedPrice: number;
  wacc: number;
  model: ModelResult;
  userInputs: UserInputs;
  conservativePrice: number;
  optimisticPrice: number;
}

const px = (v: number, ccy: string) => formatByFmt(v, "price", ccy);

export function ValuationPanel({
  symbol,
  livePrice,
  liveAsOf,
  currency = "INR",
  indiaListing = false,
}: ValuationPanelProps) {
  const [state, setState] = useState<ValuationState>({ status: "loading" });
  
  // User template inputs (initially blank or prompting the user)
  const [inputs, setInputs] = useState<UserInputs>({
    revenueGrowthPct: "",
    ebitMarginPct: "",
    waccPct: "",
    terminalGrowthPct: "",
    projectionYears: 5,
  });

  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [calculated, setCalculated] = useState<CalculatedValuation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    setState({ status: "loading" });
    setCalculated(null);
    setActivePreset(null);
    setInputs({
      revenueGrowthPct: "",
      ebitMarginPct: "",
      waccPct: "",
      terminalGrowthPct: "",
      projectionYears: 5,
    });

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
              reason: "Financial statement history is currently unavailable to load the valuation template for this security.",
            });
          }
          return;
        }
        const json = await res.json();
        if (cancelled) return;

        if (!json.dataset || !json.assumptions) {
          setState({
            status: "unavailable",
            reason: "Insufficient financial statement data to initialize the valuation template.",
          });
          return;
        }

        const baseModel = buildModel(json.dataset, json.assumptions);
        setState({
          status: "ready",
          dataset: json.dataset,
          baseAssumptions: json.assumptions,
          baseModel,
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "unavailable",
            reason: "Valuation template timed out or could not be loaded. You can open the custom model builder below.",
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

  const applyFrameworkPreset = (presetName: string) => {
    setActivePreset(presetName);
    setErrorMsg(null);

    if (presetName === "conservative") {
      setInputs({
        revenueGrowthPct: "8.0",
        ebitMarginPct: "12.0",
        waccPct: "13.0",
        terminalGrowthPct: "4.0",
        projectionYears: 5,
      });
    } else if (presetName === "moderate") {
      setInputs({
        revenueGrowthPct: "12.0",
        ebitMarginPct: "16.0",
        waccPct: "11.5",
        terminalGrowthPct: "4.5",
        projectionYears: 5,
      });
    } else if (presetName === "growth") {
      setInputs({
        revenueGrowthPct: "18.0",
        ebitMarginPct: "22.0",
        waccPct: "10.5",
        terminalGrowthPct: "5.0",
        projectionYears: 5,
      });
    } else if (presetName === "clear") {
      setInputs({
        revenueGrowthPct: "",
        ebitMarginPct: "",
        waccPct: "",
        terminalGrowthPct: "",
        projectionYears: 5,
      });
      setCalculated(null);
      setActivePreset(null);
    }
  };

  const handleCalculate = () => {
    if (state.status !== "ready") return;
    setErrorMsg(null);

    const growth = parseFloat(inputs.revenueGrowthPct);
    const margin = parseFloat(inputs.ebitMarginPct);
    const wacc = parseFloat(inputs.waccPct);
    const terminal = parseFloat(inputs.terminalGrowthPct);

    if (isNaN(growth) || isNaN(margin) || isNaN(wacc) || isNaN(terminal)) {
      setErrorMsg("Please enter valid numeric values for all 4 template assumptions (Revenue Growth, EBIT Margin, WACC, and Terminal Growth).");
      return;
    }

    if (terminal >= wacc) {
      setErrorMsg("Terminal Growth Rate cannot be greater than or equal to Discount Rate (WACC). In a standard DCF, WACC must exceed perpetual terminal growth.");
      return;
    }

    try {
      const { dataset, baseAssumptions } = state;
      const gDec = growth / 100;
      const mDec = margin / 100;
      const wDec = wacc / 100;
      const tDec = terminal / 100;

      const rf = Math.max(0.02, wDec * 0.45);
      const erp = Math.max(0.03, wDec * 0.45);
      const cod = Math.max(0.03, wDec * 0.65);

      const overrides = {
        rev_growth: gDec,
        target_ebit_margin: mDec,
        terminal_growth: tDec,
        risk_free: rf,
        erp: erp,
        cost_of_debt: cod,
        projection_years: inputs.projectionYears,
      };

      const userAssumptions = applyOverrides(baseAssumptions, overrides);
      const model = buildModel(dataset, userAssumptions);
      const impliedPrice = model.dcf?.impliedPrice ?? 0;

      // Calculate conservative and optimistic bounds based on user inputs (+/-2% growth, +/-0.5% WACC)
      const consOverrides = {
        ...overrides,
        rev_growth: Math.max(0.01, gDec - 0.02),
        risk_free: rf + 0.005,
      };
      const optOverrides = {
        ...overrides,
        rev_growth: gDec + 0.02,
        risk_free: Math.max(0.02, rf - 0.005),
      };

      const consModel = buildModel(dataset, applyOverrides(baseAssumptions, consOverrides));
      const optModel = buildModel(dataset, applyOverrides(baseAssumptions, optOverrides));

      setCalculated({
        impliedPrice,
        wacc: model.wacc.wacc,
        model,
        userInputs: { ...inputs },
        conservativePrice: consModel.dcf?.impliedPrice ?? (impliedPrice * 0.88),
        optimisticPrice: optModel.dcf?.impliedPrice ?? (impliedPrice * 1.14),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(`Calculation error: ${message}. Try adjusting your assumption inputs.`);
    }
  };

  if (state.status === "loading") {
    return (
      <Panel
        title="Valuation Model Template"
        subtitle="The platform does not quote target prices or intrinsic values. Enter your forward assumptions below to build your custom valuation model."
      >
        <div className="space-y-4 animate-pulse">
          <div className="h-20 rounded-lg bg-muted/40" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="h-20 rounded-lg bg-muted/30" />
            <div className="h-20 rounded-lg bg-muted/30" />
            <div className="h-20 rounded-lg bg-muted/30" />
            <div className="h-20 rounded-lg bg-muted/30" />
          </div>
        </div>
      </Panel>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Panel
        title="Valuation Model Template"
        subtitle="The platform does not quote target prices or intrinsic values. Enter your forward assumptions below to build your custom valuation model."
      >
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

  const { dataset } = state;
  const modelCcy = dataset.profile.currency;
  const displayCcy = indiaListing ? "INR" : currency || modelCcy;
  const canonicalPrice = livePrice != null && livePrice > 0 ? livePrice : null;

  return (
    <Panel
      title="Valuation Model Template"
      subtitle="The platform does not quote target prices or intrinsic values. Enter your forward assumptions below to build your custom valuation model."
      action={
        <Link
          href={`/research/model/${encodeURIComponent(symbol)}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <span>Open advanced 3-statement model</span>
          <ArrowRight className="size-3" />
        </Link>
      }
    >
      <div className="space-y-6">
        {/* 1. Prompt & Philosophy Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 shadow-sm">
          <Calculator className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-foreground">
              Interactive DCF Valuation Template (User-Driven Framework)
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Market Intelligence does not formulate or quote intrinsic values or price targets. An asset&apos;s valuation is fundamentally dependent on your forward thesis. Enter your forward sales growth, operating margin, discount rate (WACC), and terminal growth rate below to generate your custom DCF valuation model.
            </p>
          </div>
        </div>

        {/* 2. Interactive Template Form */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">
                Template Assumption Inputs
              </h4>
            </div>

            {/* Quick Framework Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyFrameworkPreset("conservative")}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-md border transition-all",
                  activePreset === "conservative"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Conservative
              </button>
              <button
                type="button"
                onClick={() => applyFrameworkPreset("moderate")}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-md border transition-all",
                  activePreset === "moderate"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Moderate / Base
              </button>
              <button
                type="button"
                onClick={() => applyFrameworkPreset("growth")}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-md border transition-all",
                  activePreset === "growth"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                High Growth
              </button>
              <button
                type="button"
                onClick={() => applyFrameworkPreset("clear")}
                className="text-[11px] px-2 py-1 rounded-md border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1"
                title="Reset inputs to blank"
              >
                <RotateCcw className="size-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* 4 Core Input Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Revenue Growth */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Revenue Growth (% YoY)
                </label>
                <span className="text-[10px] text-muted-foreground">Annual</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={inputs.revenueGrowthPct}
                  onChange={(e) => {
                    setInputs((prev) => ({ ...prev, revenueGrowthPct: e.target.value }));
                    setActivePreset(null);
                  }}
                  placeholder="e.g. 12.0"
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Projected compound sales growth
              </p>
            </div>

            {/* 2. EBIT / Operating Margin */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Operating / EBIT Margin (%)
                </label>
                <span className="text-[10px] text-muted-foreground">Target</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={inputs.ebitMarginPct}
                  onChange={(e) => {
                    setInputs((prev) => ({ ...prev, ebitMarginPct: e.target.value }));
                    setActivePreset(null);
                  }}
                  placeholder="e.g. 18.0"
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Normalized operating profit margin
              </p>
            </div>

            {/* 3. Discount Rate / WACC */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Discount Rate / WACC (%)
                </label>
                <span className="text-[10px] text-muted-foreground">Hurdle</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.25"
                  value={inputs.waccPct}
                  onChange={(e) => {
                    setInputs((prev) => ({ ...prev, waccPct: e.target.value }));
                    setActivePreset(null);
                  }}
                  placeholder="e.g. 11.5"
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cost of capital for cash discounting
              </p>
            </div>

            {/* 4. Terminal Growth */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Terminal Growth Rate (%)
                </label>
                <span className="text-[10px] text-muted-foreground">Perpetual</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.25"
                  value={inputs.terminalGrowthPct}
                  onChange={(e) => {
                    setInputs((prev) => ({ ...prev, terminalGrowthPct: e.target.value }));
                    setActivePreset(null);
                  }}
                  placeholder="e.g. 4.5"
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mature perpetual growth (typically 3–5%)
              </p>
            </div>
          </div>

          {/* Forecast Horizon & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-medium text-muted-foreground">Forecast Horizon:</span>
              <div className="inline-flex rounded-lg border border-border/80 p-0.5 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setInputs((prev) => ({ ...prev, projectionYears: 5 }))}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                    inputs.projectionYears === 5
                      ? "bg-card text-foreground font-semibold shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  5 Years
                </button>
                <button
                  type="button"
                  onClick={() => setInputs((prev) => ({ ...prev, projectionYears: 10 }))}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                    inputs.projectionYears === 10
                      ? "bg-card text-foreground font-semibold shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  10 Years
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCalculate}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
              >
                <Sparkles className="size-3.5" />
                <span>Calculate Custom Valuation</span>
              </button>
            </div>
          </div>

          {errorMsg ? (
            <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-600 flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : null}
        </div>

        {/* 3. Valuation Output Display */}
        {calculated ? (
          <div className="space-y-4">
            {/* Result Cards based strictly on user assumptions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border border-primary/30 bg-card p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 border-b border-l border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary rounded-bl-lg">
                User-Defined Model
              </div>

              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Your Custom Valuation (DCF)
                </span>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
                  {px(calculated.impliedPrice, modelCcy)}
                </p>
                <span className="text-xs text-muted-foreground">
                  Derived 100% from your inputs
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  vs Live Market Price
                </span>
                {canonicalPrice && canonicalPrice > 0 ? (
                  (() => {
                    const upside = (calculated.impliedPrice / canonicalPrice - 1) * 100;
                    const isUp = upside >= 0;
                    return (
                      <>
                        <p className={cn("text-2xl font-bold tabular-nums mt-0.5", isUp ? "text-emerald-600" : "text-rose-600")}>
                          {isUp ? "+" : ""}{upside.toFixed(1)}%
                        </p>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          vs Live quote {px(canonicalPrice, displayCcy)}
                        </span>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <p className="text-lg font-semibold text-muted-foreground mt-1">
                      Reference not synced
                    </p>
                    <span className="text-xs text-muted-foreground">Awaiting market tick</span>
                  </>
                )}
              </div>

              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Hurdle Rate & Terminal
                </span>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
                  {formatByFmt(calculated.wacc, "pct2")}
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Terminal Growth {calculated.userInputs.terminalGrowthPct}%
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Forecast Period
                </span>
                <p className="text-lg font-semibold text-foreground mt-1 capitalize">
                  {calculated.userInputs.projectionYears}-Year Horizon
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Growth {calculated.userInputs.revenueGrowthPct}% · Margin {calculated.userInputs.ebitMarginPct}%
                </span>
              </div>
            </div>

            {/* Custom Scenario Sensitivities (Derived strictly from User&apos;s Baseline) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Custom Scenario Sensitivity (Derived From Your Baseline)
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Growth & Hurdle Rate Sensitivity
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Conservative Sensitivity */}
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground">Conservative Sensitivity</span>
                    <span className="text-[10px] text-muted-foreground">-2% Growth</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {px(calculated.conservativePrice, modelCcy)}
                  </p>
                  {canonicalPrice ? (
                    (() => {
                      const diff = (calculated.conservativePrice / canonicalPrice - 1) * 100;
                      return (
                        <p className={cn("text-xs font-medium tabular-nums", diff >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}% vs live price
                        </p>
                      );
                    })()
                  ) : null}
                </div>

                {/* 2. User Baseline */}
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary">Your Entered Baseline</span>
                    <span className="text-[10px] text-primary font-semibold">Your Inputs</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {px(calculated.impliedPrice, modelCcy)}
                  </p>
                  {canonicalPrice ? (
                    (() => {
                      const diff = (calculated.impliedPrice / canonicalPrice - 1) * 100;
                      return (
                        <p className={cn("text-xs font-semibold tabular-nums", diff >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}% vs live price
                        </p>
                      );
                    })()
                  ) : null}
                </div>

                {/* 3. Optimistic Sensitivity */}
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground">Optimistic Sensitivity</span>
                    <span className="text-[10px] text-muted-foreground">+2% Growth</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {px(calculated.optimisticPrice, modelCcy)}
                  </p>
                  {canonicalPrice ? (
                    (() => {
                      const diff = (calculated.optimisticPrice / canonicalPrice - 1) * 100;
                      return (
                        <p className={cn("text-xs font-medium tabular-nums", diff >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}% vs live price
                        </p>
                      );
                    })()
                  ) : null}
                </div>
              </div>
            </div>

            {/* Prominent Platform Neutrality Note */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-foreground">Platform Neutrality Statement:</strong> This valuation is generated solely from the parameters you entered into the template above ({calculated.userInputs.revenueGrowthPct}% revenue growth, {calculated.userInputs.ebitMarginPct}% EBIT margin, {calculated.userInputs.waccPct}% WACC, {calculated.userInputs.terminalGrowthPct}% terminal growth). Market Intelligence does not issue price targets, automated intrinsic valuation calls, or buy/sell recommendations.
              </p>
            </div>
          </div>
        ) : (
          /* Blank / Awaiting State: Platform quotes NO number! */
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Calculator className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                No Valuation Number Quoted by Platform
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                To maintain complete analytical neutrality, this platform does not quote any automated target price. Choose a preset above or enter your custom assumptions to calculate your tailored valuation model.
              </p>
            </div>
          </div>
        )}

        {/* 4. Peer Valuation Multiples (Market Comps) */}
        {dataset.peers ? (
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Peer Valuation Multiples (Market Trading Context)
              </h4>
              <span className="text-[11px] text-muted-foreground">Observed market multiples</span>
            </div>
            <CompsPanel peers={dataset.peers} model={calculated?.model ?? state.baseModel} />
          </div>
        ) : null}

        {/* 5. Quality Diagnostics */}
        {state.baseAssumptions && (
          <div className="rounded-lg border border-border/50 bg-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Financial Statement Notes & Data Diagnostics
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Currency: {modelCcy}. Balance sheet cash and debt adjustments are based on the latest available financial filing. For full granular line-item overrides (DSO, DIO, DPO, tax rates, capital allocation, and debt schedules), open the comprehensive financial model worksheet.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
