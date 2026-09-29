"use client";

import { useState } from "react";
import { CompanyConsensusIntelligence, BrokerResearchReport } from "@/lib/broker-research/types";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  Minus,
  FileText,
} from "lucide-react";

interface Props {
  consensus: CompanyConsensusIntelligence;
}

export function ConsensusIntelligenceView({ consensus }: Props) {
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedReportId(expandedReportId === id ? null : id);
  };

  const getRatingBadge = (rating: string) => {
    switch (rating.toUpperCase()) {
      case "BUY":
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            BUY
          </span>
        );
      case "ACCUMULATE":
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/30">
            ACCUMULATE
          </span>
        );
      case "HOLD":
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            HOLD
          </span>
        );
      case "REDUCE":
      case "SELL":
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
            {rating}
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {rating}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Consensus Summary Hero Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {consensus.symbol}
              </span>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {consensus.companyName}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                {consensus.sector}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Consensus intelligence aggregated across {consensus.totalBrokersCovering} premier Indian institutional research houses.
            </p>
          </div>

          {/* Consensus Target & Upside Pill */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Consensus Target</span>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xl font-bold text-foreground tabular-nums">
                  ₹{consensus.consensusTargetPrice.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  +{consensus.consensusUpsidePct}% Upside
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums block">
                CMP: ₹{consensus.cmp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Rating Distribution & Target Spread */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          {/* Rating Breakdown */}
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Institutional Stance:{" "}
                <strong className="text-emerald-400 tabular-nums">
                  {consensus.buyRatioPct}% Bullish
                </strong>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {consensus.buyCount} Buy • {consensus.accumulateCount} Accumulate • {consensus.holdCount} Hold • {consensus.sellCount} Sell
              </span>
            </div>

            {/* Tri-color stance progress bar */}
            <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex">
              <div
                style={{ width: `${(consensus.buyCount / consensus.totalBrokersCovering) * 100}%` }}
                className="bg-emerald-500 h-full"
              />
              <div
                style={{ width: `${(consensus.accumulateCount / consensus.totalBrokersCovering) * 100}%` }}
                className="bg-teal-500 h-full"
              />
              <div
                style={{ width: `${(consensus.holdCount / consensus.totalBrokersCovering) * 100}%` }}
                className="bg-amber-500 h-full"
              />
              <div
                style={{ width: `${(consensus.sellCount / consensus.totalBrokersCovering) * 100}%` }}
                className="bg-rose-500 h-full"
              />
            </div>
          </div>

          {/* High vs Low Spread */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
            <div>
              <span className="text-[11px] text-muted-foreground block">Street High</span>
              <span className="font-bold text-emerald-400 tabular-nums text-sm">
                ₹{consensus.targetPriceHigh.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {consensus.brokerHigh}
              </span>
            </div>

            <div className="text-center px-3 border-x border-border/30">
              <span className="text-[11px] text-muted-foreground block">Target Spread</span>
              <span className="font-bold text-foreground tabular-nums text-sm">
                {consensus.targetSpreadPct}%
              </span>
              <span className="text-[10px] text-muted-foreground block">High vs Low</span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Street Low</span>
              <span className="font-bold text-amber-400 tabular-nums text-sm">
                ₹{consensus.targetPriceLow.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {consensus.brokerLow}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI Calculation: Consensus Changed -> Why? */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/10 border border-primary/30 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  AI Consensus Intelligence Engine
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-semibold text-foreground">
                  Consensus Changed → Why?
                </span>
              </div>
              <h4 className="text-base font-bold text-foreground mt-0.5">
                {consensus.whyChanged.headline}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tabular-nums">
              Net Shift: +{consensus.whyChanged.netTargetShiftPct}%
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({consensus.whyChanged.upgradesCount} Upgrades, {consensus.whyChanged.maintainedCount} Maintained)
            </span>
          </div>
        </div>

        {/* Narrative Summary */}
        <p className="text-xs text-foreground/90 leading-relaxed font-normal">
          {consensus.whyChanged.summary}
        </p>

        {/* Fundamental Shift Drivers */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
            Core Catalysts Driving Model Upgrades:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {consensus.whyChanged.drivers.map((drv, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-card border border-border/60 space-y-1.5 text-xs shadow-2xs"
              >
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{drv.title}</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {drv.description}
                </p>
                <div className="pt-1.5 border-t border-border/30 text-[11px] font-medium text-emerald-400 tabular-nums">
                  Impact: {drv.metricImpact}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The Skeptic / Bear View (Why remaining brokers haven't upgraded) */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground font-semibold mr-1">
              The Skeptic Counter-Thesis (Why the HOLDs haven't upgraded):
            </strong>
            <span>{consensus.whyChanged.skepticView}</span>
          </div>
        </div>
      </div>

      {/* 4. Comparative Broker Research Matrix (Table specified by user) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              Institutional Broker Coverage Matrix — {consensus.symbol}
            </h4>
            <p className="text-xs text-muted-foreground">
              Direct comparison of ratings, price targets, core theses, and financial models across all 11 coverage desks.
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            Showing {consensus.brokerMatrix.length} active institutional reports
          </span>
        </div>

        {/* Responsive Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Broker / Research Desk</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3">Target Price</th>
                  <th className="py-3 px-3">Upside</th>
                  <th className="py-3 px-4">Key Investment Thesis</th>
                  <th className="py-3 px-3">Revision</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {consensus.brokerMatrix.map((report) => {
                  const isExpanded = expandedReportId === report.id;
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => toggleExpand(report.id)}
                    >
                      <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{report.broker}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {report.analyst}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getRatingBadge(report.rating)}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-foreground tabular-nums whitespace-nowrap text-sm">
                        ₹{report.targetPrice.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-emerald-400 tabular-nums whitespace-nowrap">
                        +{report.upsidePct}%
                      </td>

                      <td className="py-3.5 px-4 text-foreground/80 max-w-xs md:max-w-md line-clamp-2 leading-relaxed">
                        {report.thesis}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            report.changeType === "TARGET_RAISED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {report.changeType === "TARGET_RAISED"
                            ? `+${report.targetChangePct}% Raised`
                            : "Maintained"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-muted-foreground tabular-nums whitespace-nowrap">
                        {report.displayDate}
                      </td>

                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted text-muted-foreground group-hover:text-primary transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Expanded Report Detail Drawer */}
        {expandedReportId && (
          (() => {
            const report = consensus.brokerMatrix.find((r) => r.id === expandedReportId);
            if (!report) return null;
            return (
              <div className="p-5 rounded-2xl bg-card border border-primary/40 shadow-md space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                  <div>
                    <span className="text-xs font-bold text-primary block">
                      Institutional Report Deep Dive — {report.broker}
                    </span>
                    <h5 className="text-sm font-semibold text-foreground mt-0.5">
                      {report.reportTitle}
                    </h5>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.reportPdfUrl && (
                      <a
                        href={report.reportPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Institutional PDF</span>
                      </a>
                    )}
                    <a
                      href={report.sourcePortalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2.5 py-1.5 rounded-lg bg-muted/40"
                    >
                      <span>Visit {report.broker} Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Financial Estimates Extracted from the Note */}
                {report.estimates && report.estimates.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Extracted Financial Estimates (Model Forecasts):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {report.estimates.map((est, i) => (
                        <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                          <span className="font-bold text-primary block">{est.fiscalYear} Projections</span>
                          <div>Revenue: <strong className="text-foreground tabular-nums">₹{est.revenueInrCr.toLocaleString()} Cr</strong></div>
                          <div>EBITDA: <strong className="text-foreground tabular-nums">₹{est.ebitdaInrCr.toLocaleString()} Cr ({est.ebitdaMarginPct}%)</strong></div>
                          <div>EPS: <strong className="text-foreground tabular-nums">₹{est.epsInr}</strong> (P/E: {est.peRatio}x)</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Risks & Catalysts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                    <span className="font-semibold text-rose-400 block uppercase text-[11px] tracking-wide">
                      Identified Downside Risks:
                    </span>
                    <ul className="space-y-1 text-muted-foreground">
                      {report.keyRisks.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                    <span className="font-semibold text-emerald-400 block uppercase text-[11px] tracking-wide">
                      Key Re-rating Catalysts:
                    </span>
                    <ul className="space-y-1 text-muted-foreground">
                      {report.catalysts.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
