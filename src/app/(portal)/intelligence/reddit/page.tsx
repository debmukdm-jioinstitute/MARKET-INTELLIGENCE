"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RetailSentimentHub } from "@/components/reddit/retail-sentiment-hub";

function RedditSentimentContent() {
  const searchParams = useSearchParams();
  const paramSymbol = searchParams.get("symbol")?.toUpperCase() || "RELIANCE";

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"

        title="Retail Sentiment Engine"
        subtitle="Real Reddit community posts, debate sentiment, and discussion tone for NSE-listed equities — continuously crawled, enriched with Hugging Face FinBERT AI models, and tracked across India-focused investor forums."
        trust={{
          source: "Reddit financial communities (r/IndianStreetBets, r/IndiaInvestments, r/IndianStockMarket) · Hugging Face FinBERT",
          note: "Scored using ProsusAI/FinBERT financial sentiment classification with multi-tier database caching to eliminate rate-limit errors.",
        }}
      />

      <RetailSentimentHub initialSymbol={paramSymbol} />
    </div>
  );
}

export default function RedditSentimentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading retail sentiment engine…
        </div>
      }
    >
      <RedditSentimentContent />
    </Suspense>
  );
}
