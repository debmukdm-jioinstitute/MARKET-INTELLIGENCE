"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CREDIT_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";
import { IntelligenceSourceStrip } from "@/components/ui/verify-at-source-link";
import { ShieldAlert, ExternalLink } from "lucide-react";

export default function CreditIntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Fixed Income & Corporate Credit Surveillance"
        title="Credit / Risk Intelligence"
        subtitle="Rating-agency actions from CRISIL, ICRA, CARE, India Ratings, Acuité, and Brickwork will appear here once a verified live feed is connected."
        trust={{
          source: "Agency press-release portals (manual verification links below)",
          asOf: "Feed not connected",
          methodology: "No automated agency feed exists yet, so no rating actions are shown. We show nothing rather than estimates.",
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card p-8 space-y-5 text-center max-w-2xl mx-auto">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Feed Not Connected
          </span>
        </div>
        <h2 className="text-lg font-bold text-foreground">
          Credit rating actions aren't wired to a live agency feed yet
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Indian rating agencies publish rating actions as press releases on their own portals and offer
          no free rating-action API or feed. Until a verified collector is built, this page shows no
          upgrades, downgrades, or outlook changes — we show nothing rather than estimates or
          illustrative data.
        </p>
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Verify rating actions directly at the source
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CREDIT_RISK_PANEL_SOURCES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 bg-muted/40 text-foreground hover:bg-muted/70 transition-colors"
              >
                {s.label}
                <ExternalLink className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <IntelligenceSourceStrip sources={CREDIT_RISK_PANEL_SOURCES} />
    </div>
  );
}
