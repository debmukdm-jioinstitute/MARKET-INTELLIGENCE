"use client";

import { CreditIntelligenceDesk } from "@/components/credit/credit-intelligence-desk";
import { PageHeader } from "@/components/layout/page-header";
import { IntelligenceSourceStrip } from "@/components/ui/verify-at-source-link";
import { useCreditFeed } from "@/hooks/use-credit-feed";
import { CREDIT_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";

export default function CreditIntelligencePage() {
  const { snapshot, loading, refresh } = useCreditFeed();
  const connected = snapshot?.dataStatus === "AVAILABLE" && (snapshot?.items.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Fixed Income & Corporate Credit Surveillance"
        title="Credit / Risk Intelligence"
        subtitle="Rating-agency actions from CRISIL, ICRA, CARE, India Ratings, Acuité, and Brickwork — ingested via Google News RSS with optional Firecrawl / Crawl4AI render for JS portals."
        trust={{
          source: connected ? "Agency releases (RSS + optional crawlers)" : "Agency press-release portals",
          asOf: snapshot?.asOf ? new Date(snapshot.asOf).toLocaleString("en-IN") : "Loading…",
          methodology:
            snapshot?.message ??
            "No fabricated ratings. Empty feed if collectors fail — verify on agency sites.",
        }}
      />

      <CreditIntelligenceDesk snapshot={snapshot} loading={loading} onRefresh={() => refresh()} />

      <IntelligenceSourceStrip sources={CREDIT_RISK_PANEL_SOURCES} />
    </div>
  );
}
