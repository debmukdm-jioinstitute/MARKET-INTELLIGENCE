"use client";

/**
 * Stock-specific FinBERT sentiment panel.
 *
 * Fetches recent news headlines for a given stock symbol (via the research feed)
 * and runs them through /api/hf/sentiment to get finance-domain sentiment scores.
 *
 * Used on the Research [symbol] page.
 */

import { useState, useEffect } from "react";

interface SentimentScore {
  label: "positive" | "negative" | "neutral";
  score: number;
  scores: { label: string; score: number }[];
  engine?: "finbert" | "rules";
}

interface FinBertApiResponse {
  results: SentimentScore[];
  error?: string;
}

interface StockSentimentState {
  status: "idle" | "loading" | "done" | "error";
  overall: "bullish" | "bearish" | "neutral" | null;
  overallScore: number;
  confidence: number;
  headlines: { text: string; label: string; score: number }[];
  /** true when the server fell back to keyword rules (FinBERT unavailable). */
  fallback?: boolean;
  error?: string;
}

function scoreToLabel(score: number): "bullish" | "bearish" | "neutral" {
  if (score > 0.1) return "bullish";
  if (score < -0.1) return "bearish";
  return "neutral";
}

const LABEL_COLORS = {
  bullish: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600", dot: "bg-emerald-500" },
  bearish: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-600", dot: "bg-rose-500" },
  neutral: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600", dot: "bg-amber-400" },
};

const SENTIMENT_MAP = {
  positive: "bullish",
  negative: "bearish",
  neutral: "neutral",
} as const;

export function StockSentimentPanel({ symbol, newsHeadlines }: { symbol: string; newsHeadlines?: string[] }) {
  const [state, setState] = useState<StockSentimentState>({
    status: "idle",
    overall: null,
    overallScore: 0,
    confidence: 0,
    headlines: [],
  });

  useEffect(() => {
    if (!newsHeadlines?.length && !symbol) return;

    const texts = (newsHeadlines ?? []).slice(0, 5);
    if (texts.length === 0) {
      setState((s) => ({ ...s, status: "idle" }));
      return;
    }

    setState((s) => ({ ...s, status: "loading" }));

    fetch("/api/hf/sentiment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts }),
    })
      .then((r) => r.json() as Promise<FinBertApiResponse>)
      .then((data) => {
        if (data.error) throw new Error(data.error);

        const results = data.results ?? [];
        if (!results.length) {
          setState((s) => ({ ...s, status: "done", overall: "neutral", overallScore: 0, confidence: 0 }));
          return;
        }

        // Aggregate
        let posSum = 0, negSum = 0, neuSum = 0;
        const enriched = results.map((r, i) => {
          const pScore = r.scores.find((s) => s.label === "positive")?.score ?? 0;
          const nScore = r.scores.find((s) => s.label === "negative")?.score ?? 0;
          const eScore = r.scores.find((s) => s.label === "neutral")?.score ?? 0;
          posSum += pScore;
          negSum += nScore;
          neuSum += eScore;
          return {
            text: texts[i] ?? "",
            label: SENTIMENT_MAP[r.label],
            score: r.score,
          };
        });

        const n = results.length;
        const overallScore = posSum / n - negSum / n;
        const confidence = Math.max(posSum, negSum, neuSum) / n;

        setState({
          status: "done",
          overall: scoreToLabel(overallScore),
          overallScore,
          confidence,
          headlines: enriched,
            fallback: results.some((r) => r.engine === "rules"),
          });
      })
      .catch((err: unknown) => {
        setState((s) => ({
          ...s,
          status: "error",
          error: err instanceof Error ? err.message : "Sentiment analysis failed",
        }));
      });
  }, [symbol, newsHeadlines?.join("|")]);

  if (!newsHeadlines?.length) return null;

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="rounded-xl border border-border bg-muted/10 p-4 animate-pulse">
        <div className="h-3 bg-muted rounded w-48 mb-2" />
        <div className="h-2 bg-muted rounded w-full mb-1" />
        <div className="h-2 bg-muted rounded w-3/4" />
      </div>
    );
  }

  if (state.status === "error") {
    return null; // Silent fail — don't break the page
  }

  const colors = state.overall ? LABEL_COLORS[state.overall] : LABEL_COLORS.neutral;
  const scoreBarWidth = Math.abs(state.overallScore) * 50;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            News Sentiment · {symbol}
          </span>
        </div>
        <span className={`text-sm font-bold uppercase ${colors.text}`}>
          {state.overall} · {Math.round(state.confidence * 100)}%
        </span>
      </div>

      {/* Score bar */}
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute h-full transition-all duration-700"
          style={{
            left: "50%",
            width: `${scoreBarWidth}%`,
            transform: state.overallScore >= 0 ? "none" : "translateX(-100%)",
            background: state.overallScore >= 0
              ? "linear-gradient(90deg, #10b981, #34d399)"
              : "linear-gradient(90deg, #f87171, #ef4444)",
          }}
        />
        <div className="absolute left-1/2 top-0 w-px h-full bg-border/60" />
      </div>

      {/* Per-headline scores */}
      <div className="space-y-1">
        {state.headlines.map((h, i) => {
          const hColors = h.label === "bullish" ? "text-emerald-600" : h.label === "bearish" ? "text-rose-600" : "text-amber-600";
          return (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-sm font-bold uppercase ${hColors} mt-0.5 shrink-0 w-14`}>
                {h.label}
              </span>
              <span className="text-sm text-muted-foreground leading-tight line-clamp-1">{h.text}</span>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground text-right">
        Powered by ProsusAI/FinBERT
      </p>
    </div>
  );
}
