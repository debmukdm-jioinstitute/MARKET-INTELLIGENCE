"use client";

import type { PositionRow } from "@/lib/my-portfolio/types";
import { assessPortfolioPromoterRisk } from "@/lib/promoters/risk-engine";
import { ShieldAlert, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { PROMOTER_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";
import { IntelligenceSourceStrip } from "@/components/ui/verify-at-source-link";
import { useMemo } from "react";

interface PortfolioPromoterRiskPanelProps {
  positions: PositionRow[];
}

/**
 * Promoter & governance risk panel — honest unavailable state.
 *
 * No live promoter/insider disclosure feed is connected, so no risk score can
 * be computed. The engine returns dataStatus "UNAVAILABLE" and this panel
 * says so explicitly instead of rendering invented scores or flags.
 */
export function PortfolioPromoterRiskPanel({ positions }: PortfolioPromoterRiskPanelProps) {
  const assessment = useMemo(() => assessPortfolioPromoterRisk(positions), [positions]);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span>Promoter & Governance Risk Engine</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pledge surveillance, insider selling pressure, and promoter buying support for your held positions
          </p>
        </div>

        <Link
          href="/intelligence/promoters"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>Open Promoter Tracker Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <IntelligenceSourceStrip sources={PROMOTER_RISK_PANEL_SOURCES} />

      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Promoter risk scoring unavailable. </span>
          <span className="text-muted-foreground leading-relaxed">
            {assessment.recommendationSummary} No scores or flags are shown rather than
            estimated ones.
          </span>
        </div>
      </div>
    </div>
  );
}
