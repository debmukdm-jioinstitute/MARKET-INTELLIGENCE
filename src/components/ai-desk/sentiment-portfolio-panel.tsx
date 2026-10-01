"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiAnalysisQuota } from "@/hooks/use-ai-analysis-quota";
import { aiRunErrorMessage } from "@/lib/ai/run-response";
import { cn } from "@/lib/utils";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import Link from "next/link";
import { useState } from "react";

type SentimentHoldingRow = {
  symbol: string;
  name: string;
  market: "IN" | "US";
  weight: number;
  illustrativeWeight: number;
  sentimentScore: number | null;
  label: "positive" | "neutral" | "negative" | "na";
  rationale: string;
  headlineCount: number;
};

type Result =
  | { hasHoldings: false; disclaimer: string }
  | { hasHoldings: true; asOf: string; holdings: SentimentHoldingRow[]; disclaimer: string };

function labelColor(label: SentimentHoldingRow["label"]) {
  if (label === "positive") return "text-emerald-600";
  if (label === "negative") return "text-rose-600";
  return "text-muted-foreground";
}

export function SentimentPortfolioPanel() {
  const { blocked, refreshQuota } = useAiAnalysisQuota();
  const { holdings, locked } = useMyPortfolio();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setSetupMessage(null);
    try {
      const bodyHoldings = holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        instrument_key: h.instrumentKey,
        shares: String(h.shares),
        avg_cost: String(h.avgCost),
      }));
      const res = await fetch("/api/ai/sentiment-portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ holdings: bodyHoldings }),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        const parsed = aiRunErrorMessage(json);
        if (parsed.setupMessage) setSetupMessage(parsed.setupMessage);
        else setError(parsed.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(json as Result);
      void refreshQuota();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Headlines for holdings in{" "}
          <Link href="/portfolio" className="underline">
            My Portfolio
          </Link>{" "}
          (local book + synced DB).
        </p>
        <Button onClick={run} disabled={loading || locked || holdings.length === 0 || blocked}>
          {loading ? "Reading news…" : "Score my portfolio"}
        </Button>
      </div>

      {locked ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/login?next=/research/ai-desk" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>{" "}
          to score your book.
        </p>
      ) : null}
      {!locked && holdings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add holdings on <Link href="/portfolio" className="underline">Portfolio</Link> first.
        </p>
      ) : null}

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {result && !result.hasHoldings ? (
        <p className="text-sm text-muted-foreground">
          No holdings yet — add some in <a href="/portfolio" className="underline">My Portfolio</a> first.
        </p>
      ) : null}

      {result && result.hasHoldings ? (
        <div className="space-y-2">
          {result.holdings.map((h) => (
            <div key={h.symbol} className="rounded-lg border border-border bg-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">
                    {h.symbol} <span className="font-sans text-sm font-normal text-muted-foreground">{h.name}</span>
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{h.rationale}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="outline" className={cn("h-5 px-2 text-sm uppercase", labelColor(h.label))}>
                    {h.label === "na" ? "no headlines" : h.label}
                  </Badge>
                  <p className="mt-1 text-sm text-muted-foreground/80">{h.headlineCount} headlines</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span>current weight {(h.weight * 100).toFixed(1)}%</span>
                <span>→</span>
                <span
                  className={cn(
                    h.illustrativeWeight > h.weight ? "text-emerald-600" : h.illustrativeWeight < h.weight ? "text-rose-600" : "",
                  )}
                >
                  illustrative tilt {(h.illustrativeWeight * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          <p className="text-sm text-muted-foreground/80">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
