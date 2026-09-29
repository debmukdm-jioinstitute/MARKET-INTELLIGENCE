"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { FundXRayView } from "@/components/funds/fund-xray-view";
import { getAllMutualFunds, getMutualFundById } from "@/lib/funds/database";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";

  const allFunds = useMemo(() => getAllMutualFunds(), []);
  const fund = useMemo(() => getMutualFundById(id) || allFunds[0], [allFunds, id]);

  const handleSelectFund = (newFundId: string) => {
    router.push(`/funds/${newFundId}`);
  };

  const handleNavigateToOverlap = (fundAId: string, fundBId?: string) => {
    const query = new URLSearchParams({
      tab: "overlap",
      fund: fundAId,
      ...(fundBId ? { compare: fundBId } : {}),
    });
    router.push(`/funds?${query.toString()}`);
  };

  if (!fund) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Fund Not Found</h2>
        <p className="text-sm text-muted-foreground">The mutual fund identifier &quot;{id}&quot; does not exist.</p>
        <Link href="/funds" className="text-sm text-primary underline">
          Return to Mutual Fund Intelligence
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/funds"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Funds & Accumulation Radar</span>
        </Link>
      </div>

      <PageHeader
        titleAs="h1"
        kicker="Fund Deep Dive & X-Ray"
        title={fund.name}
        subtitle={`Complete portfolio X-ray for ${fund.shortName} (${fund.category}), benchmarked against ${fund.benchmark}.`}
        trust={{
          source: "Official AMC Monthly Disclosure Sheet & AMFI",
          asOf: fund.disclosureDate,
          methodology: "ISIN-level holdings reconciliation and quantitative factor scoring",
        }}
      />

      <FundXRayView
        fund={fund}
        allFunds={allFunds}
        onSelectFund={handleSelectFund}
        onNavigateToOverlap={handleNavigateToOverlap}
      />
    </div>
  );
}
