"use client";

import React, { useEffect, useState } from "react";
import { X, ShieldCheck, Calculator, BookOpen, Clock, ExternalLink, Copy, Check, Maximize2, Minimize2, ChevronRight } from "lucide-react";
import { Latex } from "@/components/ui/latex";
import { getMetricMath, type MetricMathDefinition } from "@/lib/math-engine/registry";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

export interface MathInspectorRequest {
  metricId: string;
  title?: string;
  currentValue?: string | number | null;
  contextData?: Record<string, any>;
  source?: any;
  category?: string;
}

interface MathInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  request: MathInspectorRequest | null;
}

export function MathInspectorDrawer({ isOpen, onClose, request }: MathInspectorDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [widthMode, setWidthMode] = useState<"half" | "wide" | "full">("half");
  const [activeTab, setActiveTab] = useState<"derivation" | "theory" | "provenance">("derivation");

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab on new request
  useEffect(() => {
    if (isOpen) {
      setActiveTab("derivation");
    }
  }, [isOpen, request?.metricId]);

  if (!isOpen || !request) return null;

  const mathDef: MetricMathDefinition = getMetricMath(request.metricId, request.title);
  const derivation = mathDef.generateDerivation(request.currentValue, request.contextData);
  const title = request.title ?? mathDef.name;
  const category = request.category ?? mathDef.category;

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(mathDef.latexFormula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const widthClasses = {
    half: "w-full md:w-[50vw] lg:w-[52vw]",
    wide: "w-full md:w-[70vw] lg:w-[65vw]",
    full: "w-full",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop overlay covering the other half of the screen */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Pop-Out Math Screen (At least 50% of the screen width) */}
      <aside
        className={cn(
          "relative z-50 flex h-full flex-col border-l border-border/80 bg-card text-foreground shadow-2xl transition-all duration-300 ease-out",
          widthClasses[widthMode]
        )}
        style={{ minWidth: "320px" }}
      >
        {/* Bloomberg Terminal Top Status Bar */}
        <div className="flex items-center justify-between border-b border-border/70 bg-muted px-4 py-2.5 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-blue-600/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest border border-blue-600/20">
              <Calculator className="size-3 text-blue-600" />
              QUANT INSPECTOR
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="text-[11px] text-muted-foreground uppercase">{category}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Width Toggle (50% / 70% / 100%) */}
            <button
              type="button"
              onClick={() => setWidthMode((w) => (w === "half" ? "wide" : w === "wide" ? "full" : "half"))}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={`Toggle screen size (current: ${widthMode === "half" ? "50% split screen" : widthMode === "wide" ? "70% wide desk" : "100% full screen"})`}
            >
              {widthMode === "full" ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-600 transition-colors ml-1"
              title="Close inspector (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Header Banner with Live Active Metric Value */}
        <div className="border-b border-border/60 bg-gradient-to-r from-card/80 via-card/50 to-transparent p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-blue-600 tracking-wide uppercase">
                  {request.metricId}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600">
                  <ShieldCheck className="size-3.5" />
                  Verified Mathematical Formula
                </span>
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground mt-1 tracking-tight">
                {title}
              </h2>
            </div>

            {/* Active Displayed Metric Pill */}
            <div className="rounded-xl border border-blue-600/30 bg-blue-600/5 px-4 py-2 text-right font-mono shadow-inner">
              <span className="text-[10px] uppercase font-bold text-blue-600/80 block">
                Active Value
              </span>
              <span className="text-2xl font-bold text-blue-600 tabular-nums">
                {derivation.activeValueFormatted}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border/40 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("derivation")}
              className={cn(
                "rounded px-3 py-1 font-semibold transition-colors",
                activeTab === "derivation"
                  ? "bg-blue-600/20 text-blue-600 border border-blue-600/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Step-by-Step Proof
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("theory")}
              className={cn(
                "rounded px-3 py-1 font-semibold transition-colors",
                activeTab === "theory"
                  ? "bg-blue-600/20 text-blue-600 border border-blue-600/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Institutional Theory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("provenance")}
              className={cn(
                "rounded px-3 py-1 font-semibold transition-colors",
                activeTab === "provenance"
                  ? "bg-blue-600/20 text-blue-600 border border-blue-600/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Data Provenance
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm font-sans">
          {activeTab === "derivation" && (
            <>
              {/* 1. Formal LaTeX Mathematical Formula */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <Calculator className="size-3.5 text-blue-600" />
                    Formal Mathematical Equation (LaTeX)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLatex}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-blue-600 transition-colors"
                  >
                    {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    {copied ? "Copied" : "Copy LaTeX"}
                  </button>
                </div>

                <Latex block math={mathDef.latexFormula} />

                {/* Variable Breakdown */}
                {mathDef.variables.length > 0 && (
                  <div className="mt-2 rounded-lg border border-border/60 bg-card/40 p-3 space-y-1.5 text-xs">
                    <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                      Variable Legend & Definitions:
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {mathDef.variables.map((v) => (
                        <div key={v.symbol} className="flex items-start gap-2">
                          <Latex math={v.symbol} className="text-blue-600 font-bold" />
                          <div>
                            <span className="font-semibold text-foreground">{v.name}</span>:{" "}
                            <span className="text-muted-foreground text-[11px]">{v.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Live Parameter Inputs Table */}
              <section className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono block">
                  Active Parameter Inputs (Live Portfolio Data)
                </span>
                <div className="overflow-hidden rounded-lg border border-border/80 bg-card/50">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-[10px] uppercase text-muted-foreground">
                        <th className="py-2 px-3">Symbol</th>
                        <th className="py-2 px-3">Parameter Name</th>
                        <th className="py-2 px-3 text-right">Value</th>
                        <th className="py-2 px-3">Data Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {derivation.inputs.map((inp, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-3 text-blue-600 font-bold">
                            <Latex math={inp.symbol} />
                          </td>
                          <td className="py-2 px-3 font-sans text-foreground">{inp.label}</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-600">{inp.value}</td>
                          <td className="py-2 px-3 text-muted-foreground text-[11px]">{inp.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 3. Step-by-Step Arithmetic Substitution Proof */}
              <section className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                  <ChevronRight className="size-4 text-emerald-600" />
                  Step-by-Step Arithmetic Proof & Derivation
                </span>

                <div className="space-y-2.5">
                  {derivation.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-2 font-mono transition-colors hover:border-blue-600/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-[10px] font-bold text-blue-600 border border-blue-600/30">
                          {step.stepNumber}
                        </span>
                        <span className="font-semibold text-xs text-foreground font-sans">{step.title}</span>
                      </div>

                      <Latex block math={step.latex} />

                      <p className="text-xs text-muted-foreground font-sans leading-relaxed pt-1">
                        {step.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Final Verification Box */}
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-600 flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span>{derivation.verification}</span>
                </div>
              </section>
            </>
          )}

          {activeTab === "theory" && (
            <div className="space-y-5">
              {/* Economic Interpretation */}
              <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                <span className="text-xs font-bold uppercase text-primary font-mono flex items-center gap-1.5">
                  <BookOpen className="size-4" />
                  Financial Theory & Quantitative Intuition
                </span>
                <p className="text-foreground text-xs leading-relaxed">
                  {mathDef.economicInterpretation}
                </p>
              </section>

              {/* Institutional Utility */}
              <section className="rounded-xl border border-border/80 bg-card p-4 space-y-2 font-mono text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  How Hedge Funds & Portfolio Managers Use This Metric
                </span>
                <p className="text-muted-foreground font-sans leading-relaxed">
                  {mathDef.institutionalUtility}
                </p>
              </section>
            </div>
          )}

          {activeTab === "provenance" && (
            <div className="space-y-4">
              <section className="rounded-xl border border-border/80 bg-card p-4 space-y-3 font-mono text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  Verified Data Provenance & Methodology
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-semibold text-foreground">{mathDef.provenance.provider}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Sampling Frequency:</span>
                    <span className="text-foreground">{mathDef.provenance.frequency}</span>
                  </div>
                  <div className="border-b border-border/50 pb-2">
                    <span className="text-muted-foreground block mb-1">Methodology Standards:</span>
                    <span className="text-foreground font-sans text-xs">{mathDef.provenance.methodology}</span>
                  </div>
                </div>

                {mathDef.provenance.url && (
                  <div className="pt-2">
                    <a
                      href={mathDef.provenance.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs font-bold"
                    >
                      Official Methodology & Exchange Documentation <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Bloomberg Terminal Footer */}
        <div className="flex items-center justify-between border-t border-border/70 bg-muted px-5 py-3 font-mono text-xs">
          <span className="text-muted-foreground text-[11px]">
            Esc to close · Press Maximize for full desk
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-secondary px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}
