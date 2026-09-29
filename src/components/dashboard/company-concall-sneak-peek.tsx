"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Mic, FileText, Calculator, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { COMPANY_INTELLIGENCE_REGISTRY } from "@/lib/company-intelligence/database";
import { cn } from "@/lib/utils";

const SYMBOLS = ["TATAMOTORS", "RELIANCE", "INFY", "SUZLON"] as const;
type SymbolKey = (typeof SYMBOLS)[number];

export function CompanyConcallSneakPeek() {
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolKey>("TATAMOTORS");
  const profile = COMPANY_INTELLIGENCE_REGISTRY[selectedSymbol];

  const concall = profile?.latestConcall;
  const timeline = profile?.timeline.slice(0, 3) ?? [];

  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Building2 className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Micro & Corporate Intelligence
            </p>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Company Timelines, Concall Guidance & Valuation Sandbox
            </h2>
          </div>
        </div>

        {/* Symbol selector pills */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium">
          {SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setSelectedSymbol(sym)}
              className={cn(
                "rounded-lg px-2.5 py-1 transition-all",
                selectedSymbol === sym
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-column Grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Column (7 cols): Concall Intelligence & Guidance */}
        <div className="space-y-3 lg:col-span-7">
          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Latest Earnings Call: {concall?.quarter} ({concall?.date})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Confidence: {concall?.dimensions.managementConfidence.score}/100 ({concall?.dimensions.managementConfidence.stance})
              </span>
            </div>

            <p className="mt-2 text-xs text-foreground font-medium italic border-l-2 border-primary/50 pl-2.5 py-0.5">
              &quot;{concall?.headlineVerdict}&quot;
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-lg bg-background/80 border border-border/60 p-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Revenue Target</p>
                <p className="mt-0.5 font-bold text-foreground truncate">{concall?.dimensions.revenueOutlook.targetGrowthPct}</p>
                <p className="text-[10px] text-muted-foreground truncate">{concall?.dimensions.revenueOutlook.stance}</p>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Margin Stance</p>
                <p className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400 truncate">{concall?.dimensions.marginOutlook.stance}</p>
                <p className="text-[10px] text-muted-foreground truncate">{concall?.dimensions.marginOutlook.targetMarginPct}</p>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Capex Outlay</p>
                <p className="mt-0.5 font-bold text-foreground truncate">₹{concall?.dimensions.capex.outlayInrCr.toLocaleString("en-IN")} Cr</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">{concall?.dimensions.capex.debtImpact}</p>
              </div>
            </div>

            {/* Q&A Highlight */}
            {concall?.analystQA[0] && (
              <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Q: {concall.analystQA[0].analystName} ({concall.analystQA[0].firm})
                  </span>
                  <span className="rounded bg-background px-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Tone: {concall.analystQA[0].tone}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-1 italic">
                  &quot;{concall.analystQA[0].question}&quot;
                </p>
                <p className="text-foreground line-clamp-2">
                  <span className="font-semibold text-primary">{concall.analystQA[0].managementSpeaker}:</span>{" "}
                  {concall.analystQA[0].answerSummary}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Timeline & Valuation Sandbox Prompt */}
        <div className="space-y-3 lg:col-span-5 flex flex-col justify-between">
          {/* Intelligence Timeline */}
          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-blue-500" />
                Company Disclosures Timeline
              </span>
              <span className="text-[11px] text-muted-foreground">{profile?.companyName}</span>
            </div>

            <div className="mt-2.5 space-y-2">
              {timeline.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5">
                    {entry.displayDate || entry.date}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{entry.headline}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{entry.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Valuation Model Sandbox Teaser */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              <p className="text-xs font-bold text-foreground">Interactive Valuation Sandbox</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              We provide clean valuation templates (DCF, Reverse DCF, EV/EBITDA multiples). You input your own growth, WACC, and margin assumptions — zero hardcoded numbers.
            </p>
            <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-border/60">
              <span className="text-[11px] font-semibold text-primary">Templates: DCF · Gordon Growth · SOTP</span>
              <Link
                href={`/research/model/${selectedSymbol}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Launch Model <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          Real-time crawler parses BSE/NSE regulatory filings, Investor Relations presentations, and official quarterly transcripts.
        </span>
        <Link
          href="/intelligence/company"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Open Company Intelligence Desk & Timelines <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
