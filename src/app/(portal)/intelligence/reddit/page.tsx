"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RetailSentimentHub } from "@/components/reddit/retail-sentiment-hub";
import { getAllRetailSentimentData } from "@/lib/reddit-sentiment/database";

function RedditSentimentContent() {
  const searchParams = useSearchParams();
  const paramSymbol = searchParams.get("symbol")?.toUpperCase() || "RELIANCE";

  const initialData = useMemo(() => {
    return getAllRetailSentimentData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Alternative Data & Social Sentiment"
        title="Retail Sentiment Engine"
        subtitle="Alternative data aggregated across 10 premier Indian and global Reddit communities. Measure retail mention spikes, positive/negative sentiment breakdown, bull/bear theses, and unaddressed investor problems."
        trust={{
          source: "r/IndiaInvestments, r/IndianStreetBets, r/IndianStockMarket, r/personalfinanceindia, r/ValueInvesting & Global Communities",
          asOf: "Continuous Social NLP Stream",
          methodology: "Natural language processing of ticker co-occurrences, weighted sentiment polarity, comment volume surges, and retail problem clustering.",
        }}
      />

      <RetailSentimentHub
        initialData={initialData}
        initialSymbol={paramSymbol}
      />
    </div>
  );
}

export default function RedditSentimentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading retail sentiment engine...
        </div>
      }
    >
      <RedditSentimentContent />
    </Suspense>
  );
}
