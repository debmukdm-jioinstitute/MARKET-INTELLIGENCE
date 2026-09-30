"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PromoterTrackerView } from "@/components/promoters/promoter-tracker-view";

export default function PromotersIntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Ownership & Corporate Governance Radar"
        title="Promoter Activity Tracker"
        subtitle="Track promoter buying, selling, pledge creation/release, insider trading, large shareholder changes, and bulk/block deals — integrated with portfolio risk."
        trust={{
          source: "No live disclosure feed connected",
          asOf: "Coverage unavailable",
          methodology:
            "Promoter and insider disclosures are not wired to a live source yet. No activity data is shown rather than estimated data.",
        }}
      />

      <PromoterTrackerView />
    </div>
  );
}
