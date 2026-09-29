"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CreditTrackerView } from "@/components/credit/credit-tracker-view";
import { getAllCreditActivities } from "@/lib/credit/database";

export default function CreditIntelligencePage() {
  const activities = useMemo(() => getAllCreditActivities(), []);

  const summary = useMemo(() => {
    let upgrades = 0;
    let downgrades = 0;
    let watches = 0;
    let defaults = 0;
    let liquidityAlerts = 0;
    let totalRatedDebt = 0;

    for (const item of activities) {
      totalRatedDebt += item.ratedDebtAmountCr;
      if (item.action === "RATING_UPGRADE") upgrades += 1;
      else if (item.action === "RATING_DOWNGRADE") downgrades += 1;
      else if (item.action === "CREDIT_WATCH") watches += 1;
      else if (item.action === "DEFAULT") defaults += 1;
      else if (item.action === "LIQUIDITY_CONCERN") liquidityAlerts += 1;
    }

    const migrationRatio = downgrades > 0 ? Number((upgrades / downgrades).toFixed(2)) : upgrades;
    const netCreditStance =
      upgrades > downgrades ? "CREDIT_UPGRADE_CYCLE" : downgrades > upgrades ? "CREDIT_STRESS" : "NEUTRAL";

    return {
      totalActionsTracked: activities.length,
      upgradesCount: upgrades,
      downgradesCount: downgrades,
      creditWatchCount: watches,
      defaultsCount: defaults,
      liquidityConcernsCount: liquidityAlerts,
      totalRatedDebtCr: Number(totalRatedDebt.toFixed(1)),
      creditMigrationRatio: migrationRatio,
      netCreditStance,
      reportingPeriod: "September 2026 Disclosures",
    };
  }, [activities]);

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Fixed Income & Corporate Credit Surveillance"
        title="Credit / Risk Intelligence"
        subtitle="Monitor CRISIL, ICRA, CARE, India Ratings, Acuité, and Brickwork. Track upgrades, downgrades, outlook shifts, credit watch, defaults, and liquidity concerns connected directly to equity stock prices."
        trust={{
          source: "SEBI (Credit Rating Agencies) Regulations 1999 & External Credit Assessment Institutions (ECAI)",
          asOf: "September 2026 Reporting Cycle",
          methodology: "Direct ingestion of official credit rating rationales cross-referenced with equity market prices and implied credit spreads.",
        }}
      />

      <CreditTrackerView activities={activities} summary={summary} />
    </div>
  );
}
