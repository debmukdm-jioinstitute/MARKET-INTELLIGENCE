"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PromoterIntelligenceDesk } from "@/components/promoters/promoter-intelligence-desk";
import { IntelligenceSourceStrip } from "@/components/ui/verify-at-source-link";
import { usePromoterFeed } from "@/hooks/use-promoter-feed";
import { PROMOTER_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";

export default function PromotersIntelligencePage() {
  const { snapshot, loading, refresh } = usePromoterFeed();
  const connected = snapshot?.dataStatus === "AVAILABLE" && (snapshot?.items.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Ownership & Corporate Governance Radar"
        title="Promoter Activity Tracker"
        subtitle="Promoter buying/selling, pledges, insider trades, and bulk/block deals — Google News RSS plus optional Firecrawl / Crawl4AI on NSE/BSE filing pages."
        trust={{
          source: connected ? "NSE / BSE / news-indexed disclosures" : "Exchange corporate filing portals",
          asOf: snapshot?.asOf ? new Date(snapshot.asOf).toLocaleString("en-IN") : "Loading…",
          methodology:
            snapshot?.message ??
            "No estimated stake math — headlines and links only until you verify on exchange portals.",
        }}
      />

      <PromoterIntelligenceDesk snapshot={snapshot} loading={loading} onRefresh={() => refresh()} />

      <IntelligenceSourceStrip sources={PROMOTER_RISK_PANEL_SOURCES} />
    </div>
  );
}
