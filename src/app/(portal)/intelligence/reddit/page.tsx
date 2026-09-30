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
        kicker="Alternative Data & Social Sentiment"
        title="Retail Sentiment Engine"
        subtitle="Real Reddit posts, fetched live, for any NSE-listed company you search — not a precomputed dataset."
        trust={{
          source: "Reddit public search API (India-focused subreddits, see Communities tab)",
          note: "Keyword-based sentiment on real post titles, not a trained model — a rough signal, not investment advice.",
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
          Loading retail sentiment engine...
        </div>
      }
    >
      <RedditSentimentContent />
    </Suspense>
  );
}
