"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PromoterTrackerView } from "@/components/promoters/promoter-tracker-view";
import { getAllPromoterActivities } from "@/lib/promoters/database";

export default function PromotersIntelligencePage() {
  const activities = useMemo(() => getAllPromoterActivities(), []);

  const summary = useMemo(() => {
    let buyingVal = 0;
    let sellingVal = 0;
    let pledgeAlerts = 0;
    let blockVal = 0;
    let bulkVal = 0;

    for (const act of activities) {
      if (act.category === "PROMOTER_BUYING" || act.category === "INSIDER_BUYING") {
        buyingVal += act.transactionValueCr;
      } else if (act.category === "PROMOTER_SELLING" || act.category === "INSIDER_SELLING") {
        sellingVal += act.transactionValueCr;
      }

      if (act.category === "PLEDGE_INCREASE") {
        pledgeAlerts += 1;
      }
      if (act.category === "BLOCK_DEAL") {
        blockVal += act.transactionValueCr;
      }
      if (act.category === "BULK_DEAL") {
        bulkVal += act.transactionValueCr;
      }
    }

    const netSentiment =
      buyingVal > sellingVal * 1.2
        ? "BULLISH_NET_BUYING"
        : sellingVal > buyingVal * 1.2
        ? "BEARISH_NET_SELLING"
        : "NEUTRAL";

    return {
      totalTransactions: activities.length,
      totalBuyingValueCr: Number(buyingVal.toFixed(1)),
      totalSellingValueCr: Number(sellingVal.toFixed(1)),
      netFlowCr: Number((buyingVal - sellingVal).toFixed(1)),
      pledgeAlertsCount: pledgeAlerts,
      blockDealsValueCr: Number(blockVal.toFixed(1)),
      bulkDealsValueCr: Number(bulkVal.toFixed(1)),
      netPromoterSentiment: netSentiment,
      reportingPeriod: "September 2026 Disclosures",
    };
  }, [activities]);

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Ownership & Corporate Governance Radar"
        title="Promoter Activity Tracker"
        subtitle="Track promoter buying, selling, pledge creation/release, insider trading, large shareholder changes, and bulk/block deals — integrated with portfolio risk."
        trust={{
          source: "SEBI SAST Regulations 2011, SEBI PIT Regulations 2015 & Stock Exchange Block/Bulk Windows",
          asOf: "September 2026 Reporting Cycle",
          methodology: "Real-time aggregation of Form C disclosures, encumbrance filings under Reg 31, and verified institutional block deal execution data.",
        }}
      />

      <PromoterTrackerView activities={activities} summary={summary} />
    </div>
  );
}
