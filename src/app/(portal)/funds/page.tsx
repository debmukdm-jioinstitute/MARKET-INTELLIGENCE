"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { FundSubnav, type FundTab } from "@/components/funds/fund-subnav";
import { InstitutionalAccumulationView } from "@/components/funds/institutional-accumulation-view";
import { FundXRayView } from "@/components/funds/fund-xray-view";
import { FundOverlapView } from "@/components/funds/fund-overlap-view";
import { AmcSourcesView } from "@/components/funds/amc-sources-view";
import { MUTUAL_FUNDS_STORE, getAllMutualFunds, getMutualFundById } from "@/lib/funds/database";
import {
  computeInstitutionalAccumulation,
  getInstitutionalSectorFlows,
} from "@/lib/funds/analytics";

function FundsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as FundTab) || "accumulation";
  const fundParam = searchParams.get("fund") || "parag-parikh-flexi-cap";
  const compareParam = searchParams.get("compare") || "icici-pru-bluechip";

  const [activeTab, setActiveTab] = useState<FundTab>(tabParam);
  const [selectedFundId, setSelectedFundId] = useState<string>(fundParam);
  const [comparisonFundId, setComparisonFundId] = useState<string>(compareParam);

  // Sync state with URL params
  useEffect(() => {
    if (tabParam && ["accumulation", "xray", "overlap", "sources"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (fundParam) {
      setSelectedFundId(fundParam);
    }
  }, [fundParam]);

  const handleTabChange = (tab: FundTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/funds?${params.toString()}`, { scroll: false });
  };

  const handleSelectFund = (fundId: string) => {
    setSelectedFundId(fundId);
    setActiveTab("xray");
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "xray");
    params.set("fund", fundId);
    router.replace(`/funds?${params.toString()}`, { scroll: false });
  };

  const handleNavigateToOverlap = (fundAId: string, fundBId?: string) => {
    setSelectedFundId(fundAId);
    if (fundBId) setComparisonFundId(fundBId);
    setActiveTab("overlap");
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "overlap");
    params.set("fund", fundAId);
    if (fundBId) params.set("compare", fundBId);
    router.replace(`/funds?${params.toString()}`, { scroll: false });
  };

  const allFunds = useMemo(() => getAllMutualFunds(), []);
  const currentFund = useMemo(() => getMutualFundById(selectedFundId) || allFunds[0], [allFunds, selectedFundId]);

  const accumulationData = useMemo(() => {
    const all = computeInstitutionalAccumulation(allFunds);
    const flows = getInstitutionalSectorFlows(allFunds);
    const topAcc = all.filter((s) => s.netValueBoughtCr > 0).slice(0, 5);
    const topTrim = all.filter((s) => s.netValueBoughtCr < 0).slice(-5).reverse();
    const fresh = all.filter((s) => s.trend === "FRESH_ENTRY");
    const totalNetCapital = all.reduce((sum, s) => sum + s.netValueBoughtCr, 0);

    return {
      stocks: all,
      topAccumulated: topAcc,
      topTrimmed: topTrim,
      freshEntries: fresh,
      sectorFlows: flows,
      summary: {
        totalNetCapitalCr: Number(totalNetCapital.toFixed(1)),
        fundsTrackedCount: allFunds.length,
        accumulatedStocksCount: all.filter((s) => s.netValueBoughtCr > 0).length,
        trimmedStocksCount: all.filter((s) => s.netValueBoughtCr < 0).length,
        disclosureMonth: "September 2026",
      },
    };
  }, [allFunds]);

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Invest & Institutional Flow Intelligence"
        title="Mutual Fund Intelligence"
        subtitle="Institutional accumulation radar, portfolio X-ray diagnostics, sector tilts, and overlap analysis across India's premier mutual funds."
        trust={{
          source: "AMFI Daily NAV Feed & AMC Monthly Portfolio Disclosures (SEBI Master Circular 2024)",
          asOf: "September 2026 Reporting Cycle",
          methodology: "Holdings aggregated at ISIN level; Overlap computed as sum of min(wA, wB); Accumulation reflects net capital additions across reporting periods.",
        }}
      />

      {/* Subnavigation Bar */}
      <FundSubnav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedFundId={selectedFundId}
      />

      {/* Active Tab View */}
      <div className="min-h-[500px]">
        {activeTab === "accumulation" && (
          <InstitutionalAccumulationView
            stocks={accumulationData.stocks}
            topAccumulated={accumulationData.topAccumulated}
            topTrimmed={accumulationData.topTrimmed}
            freshEntries={accumulationData.freshEntries}
            sectorFlows={accumulationData.sectorFlows}
            summary={accumulationData.summary}
            onSelectFund={handleSelectFund}
          />
        )}

        {activeTab === "xray" && currentFund && (
          <FundXRayView
            fund={currentFund}
            allFunds={allFunds}
            onSelectFund={handleSelectFund}
            onNavigateToOverlap={handleNavigateToOverlap}
          />
        )}

        {activeTab === "overlap" && (
          <FundOverlapView
            allFunds={allFunds}
            initialFundAId={selectedFundId}
            initialFundBId={comparisonFundId}
            onSelectFund={handleSelectFund}
          />
        )}

        {activeTab === "sources" && <AmcSourcesView />}
      </div>
    </div>
  );
}

export default function FundsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Mutual Fund Intelligence...</div>}>
      <FundsContent />
    </Suspense>
  );
}
