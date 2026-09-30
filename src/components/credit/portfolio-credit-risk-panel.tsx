"use client";

import { useMemo } from "react";
import type { PositionRow } from "@/lib/my-portfolio/types";
import { assessPortfolioCreditRisk } from "@/lib/credit/database";
import { ShieldAlert, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { CREDIT_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";
import { IntelligenceSourceStrip } from "@/components/ui/verify-at-source-link";

interface PortfolioCreditRiskPanelProps {
  positions: PositionRow[];
}

export function PortfolioCreditRiskPanel({ positions }: PortfolioCreditRiskPanelProps) {
  const assessment = useMemo(() => {
    return assessPortfolioCreditRisk(positions);
  }, [positions]);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span>Credit & Debt Rating Risk Radar</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Credit agency upgrades, downgrades, and liquidity health across your held positions
          </p>
        </div>

        <Link
          href="/intelligence/credit"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>Open Credit Intelligence Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-6 rounded-xl bg-muted/30 border border-border/40 text-center space-y-3">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Feed Not Connected
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">Credit-risk scoring unavailable</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
          {assessment.message} No credit health score is shown — we show nothing rather than
          estimates. Verify issuer ratings directly on the agency portals below.
        </p>
      </div>

      <IntelligenceSourceStrip sources={CREDIT_RISK_PANEL_SOURCES} />
    </div>
  );
}
