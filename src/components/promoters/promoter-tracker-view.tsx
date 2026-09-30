"use client";

import { Building, ExternalLink } from "lucide-react";
import { PROMOTER_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";
import {
  IntelligenceSourceStrip,
  VerifyAtSourceLink,
} from "@/components/ui/verify-at-source-link";

/**
 * Promoter activity tracker — honest unavailable state.
 *
 * There is no live feed for India promoter/insider (SAST/PIT) disclosures, so
 * no activity list is rendered. Verify-at-source portal links are provided
 * instead of fabricated records.
 */
export function PromoterTrackerView() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Building className="w-3.5 h-3.5" />
              <span>Coverage unavailable — no live disclosure feed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Promoter & Insider Activity Tracker
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Promoter and insider disclosures are not wired to a live source yet, so no
              buying, selling, pledge, or bulk/block deal activity can be shown. We show
              nothing rather than estimated data. Verify the latest disclosures directly
              on the official portals below.
            </p>
            <IntelligenceSourceStrip sources={PROMOTER_RISK_PANEL_SOURCES} className="pt-1" />
          </div>
        </div>

        <div className="pt-3 border-t border-border/60">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
            Verify at source
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {PROMOTER_RISK_PANEL_SOURCES.map((link) => (
              <VerifyAtSourceLink key={link.href} {...link} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>
              NSE and BSE publish insider-trading, SAST, pledge, and bulk/block deal
              disclosures on their corporate-filings pages.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
