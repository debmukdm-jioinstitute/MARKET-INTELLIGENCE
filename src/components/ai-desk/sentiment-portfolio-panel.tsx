"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiAnalysisQuota } from "@/hooks/use-ai-analysis-quota";
import { aiRunErrorMessage } from "@/lib/ai/run-response";
import { cn } from "@/lib/utils";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { Newspaper } from "lucide-react";
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
  return "text-stone-500";
}

function ScoreBar({ score }: { score: number | null }) {
  if (score == null)
    return (
      <div className="h-2 rounded-full bg-stone-100">
        <p className="pt-3 text-xs text-stone-400">No headlines found to score.</p>
      </div>
    );
  // score is -1..1 → position on a diverging bar
  const pct = ((score + 1) / 2) * 100;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-stone-100">
        <div className="absolute left-1/2 top-0 h-full w-px bg-stone-300" aria-hidden />
        <div
          className={cn("absolute top-0 h-full rounded-full", score >= 0 ? "bg-emerald-500" : "bg-rose-500")}
          style={
            score >= 0
              ? { left: "50%", width: `${(score / 1) * 50}%` }
              : { right: "50%", width: `${(-score / 1) * 50}%` }
          }
        />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-stone-700 shadow"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-stone-400">
        <span>−1 · very negative</span>
        <span>+1 · very positive</span>
      </div>
    </div>
  );
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
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500">
            <Newspaper className="size-6 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-stone-900">How does the news feel about your stocks?</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              An AI reads recent headlines for each holding in{" "}
              <Link href="/portfolio" className="font-medium text-teal-700 underline">
                My Portfolio
              </Link>{" "}
              and scores the mood — then shows an <em>illustrative</em> tilt: what your weights would look like if you
              leaned toward the good news.
            </p>
          </div>
          <Button onClick={run} disabled={loading || locked || holdings.length === 0 || blocked} className="shrink-0">
            {loading ? "Reading news…" : blocked ? "Upgrade to run" : "Score my portfolio"}
          </Button>
        </div>

        {locked ? (
          <p className="mt-3 text-sm text-stone-500">
            <Link href="/login?next=/research/ai-desk" className="font-semibold text-teal-700 hover:underline">
              Sign in
            </Link>{" "}
            to score your book.
          </p>
        ) : null}
        {!locked && holdings.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            Add holdings on <Link href="/portfolio" className="font-medium text-teal-700 underline">Portfolio</Link>{" "}
            first — there&apos;s nothing to score yet.
          </p>
        ) : null}
        {blocked && !locked && holdings.length > 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            Free monthly limit used.{" "}
            <Link href="/pricing" className="font-semibold text-teal-700 hover:underline">
              Upgrade
            </Link>{" "}
            for unlimited runs.
          </p>
        ) : null}
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-amber-500" />
            </span>
            <p className="text-sm font-medium text-stone-700">Reading the latest headlines for each holding…</p>
          </div>
        </div>
      ) : null}

      {result && !result.hasHoldings ? (
        <p className="text-sm text-stone-500">
          No holdings yet — add some in <Link href="/portfolio" className="underline">My Portfolio</Link> first.
        </p>
      ) : null}

      {result && result.hasHoldings ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-400">Scored {result.asOf}. Newest headlines first.</p>
          {result.holdings.map((h) => (
            <div key={h.symbol} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-stone-900">
                    {h.symbol} <span className="font-normal text-stone-400">{h.name}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {h.market === "IN" ? "NSE" : "US"} · {h.headlineCount} headlines read
                  </p>
                </div>
                <Badge variant="outline" className={cn("h-6 px-3 text-xs uppercase", labelColor(h.label))}>
                  {h.label === "na" ? "no headlines" : h.label}
                </Badge>
              </div>

              <div className="mt-4 max-w-md">
                <ScoreBar score={h.sentimentScore} />
                {h.sentimentScore != null ? (
                  <p className="mt-2 text-sm text-stone-600">
                    News mood: <span className="font-semibold text-stone-800">{h.sentimentScore.toFixed(2)}</span>{" "}
                    <span className="text-stone-400">
                      (−1 is very negative, +1 is very positive — a machine reading of headlines, not a fact about the
                      company.)
                    </span>
                  </p>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-stone-600">{h.rationale}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-stone-50 px-4 py-3 text-sm">
                <span className="text-stone-500">
                  Your weight <span className="font-semibold text-stone-800">{(h.weight * 100).toFixed(1)}%</span>
                </span>
                <span className="text-stone-300" aria-hidden>→</span>
                <span
                  className={cn(
                    "font-semibold",
                    h.illustrativeWeight > h.weight
                      ? "text-emerald-600"
                      : h.illustrativeWeight < h.weight
                        ? "text-rose-600"
                        : "text-stone-700",
                  )}
                >
                  Illustrative tilt {(h.illustrativeWeight * 100).toFixed(1)}%
                </span>
              </div>
              <p className="mt-1.5 text-xs text-stone-400">
                What this means: if you tilted toward the better news, this is roughly how the weight would move —
                an illustration for research, not a suggestion to buy or sell.
              </p>
            </div>
          ))}
          <p className="text-sm text-stone-400">{result.disclaimer}</p>
        </div>
      ) : null}

      {!result && !loading && !locked && holdings.length > 0 ? (
        <p className="text-center text-sm text-stone-400">
          Nothing scored yet — press “Score my portfolio” to read the mood of your holdings.
        </p>
      ) : null}
    </div>
  );
}
