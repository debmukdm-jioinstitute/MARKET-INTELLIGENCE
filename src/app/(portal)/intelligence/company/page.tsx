"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyIntelligenceHub } from "@/components/company/company-intelligence-hub";
import {
  getCompanyIntelligenceProfile,
  getFeaturedIntelligenceSymbols,
} from "@/lib/company-intelligence/database";

function CompanyIntelligenceContent() {
  const searchParams = useSearchParams();
  const paramSymbol = searchParams.get("symbol")?.toUpperCase() || "TATAMOTORS";

  const initialProfile = useMemo(() => {
    return getCompanyIntelligenceProfile(paramSymbol);
  }, [paramSymbol]);

  const featured = useMemo(() => {
    return getFeaturedIntelligenceSymbols();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Investor Relations & Earnings Concalls"
        title="Company-Specific & Concall Intelligence"
        subtitle="Automated IR crawler, company intelligence disclosure timeline, AI-synthesized 'What changed?' variance, and longitudinal management tone tracking across Indian listed equities."
        trust={{
          source: "Company IR Portals, NSE/BSE SEBI LODR Filings, Earnings Conference Call Transcripts",
          asOf: "Continuous Corporate Disclosure Stream",
          methodology: "Multimodal ingestion of investor decks, quarterly earnings releases, annual reports, concall transcripts, and exchange announcements with NLP sentiment tone extraction.",
        }}
      />

      <CompanyIntelligenceHub
        initialProfile={initialProfile}
        featuredSymbols={featured}
        initialSymbol={paramSymbol}
      />
    </div>
  );
}

export default function CompanyIntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading company intelligence...
        </div>
      }
    >
      <CompanyIntelligenceContent />
    </Suspense>
  );
}
