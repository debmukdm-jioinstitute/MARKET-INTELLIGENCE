"use client";

/**
 * Stock-specific FinBERT sentiment panel.
 *
 * Fetches recent news headlines for a given stock symbol (via the research feed)
 * and runs them through /api/hf/sentiment to get finance-domain sentiment scores.
 * Each headline links out to its source article so the reader can verify.
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

/** A headline with its source link. Plain strings are still tolerated. */
export interface SentimentNewsItem {
  title: string;
  url?: string;
  /** Publisher name, e.g. "Kalkine India" (from the feed's <source> tag). */
  publisher?: string;
}

interface StockSentimentState {
  status: "idle" | "loading" | "done" | "error";
  overall: "bullish" | "bearish" | "neutral" | null;
  overallScore: number;
  /** Winning side's share of total confidence weight, 0..100 */
  sharePct: number;
  headlines: { title: string; url?: string; publisher?: string; label: string; score: number }[];
  /** true when the server fell back to keyword rules (FinBERT unavailable). */
  fallback?: boolean;
  error?: string;
}

function scoreToLabel(score: number): "bullish" | "bearish" | "neutral" {
  if (score > 0.1) return "bullish";
  if (score < -0.1) return "bearish";
  return "neutral";
}

/** Defensive entity decode — the RSS layer decodes too, but never trust the wire. */
function decodeEntities(s: string): string {
  if (!s || !s.includes("&")) return s;
  return s
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_m, n: string) => {
      const map: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
      return map[n.toLowerCase()] ?? _m;
    });
}

/** Google News appends " - Publisher" to titles; show the publisher separately instead. */
function cleanTitle(title: string, publisher?: string): string {
  const decoded = decodeEntities(title);
  if (publisher) {
    const suffix = ` - ${publisher}`;
    if (decoded.endsWith(suffix)) return decoded.slice(0, -suffix.length).trim();
  }
  return decoded;
}

function normalizeItems(items: (string | SentimentNewsItem)[] | undefined): SentimentNewsItem[] {
  return (items ?? []).map((it) => (typeof it === "string" ? { title: it } : it)).filter((it) => it.title);
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

export function StockSentimentPanel({
  symbol,
  newsItems,
}: {
  symbol: string;
  newsItems?: (string | SentimentNewsItem)[];
}) {
  const [state, setState] = useState<StockSentimentState>({
    status: "idle",
    overall: null,
    overallScore: 0,
    sharePct: 0,
    headlines: [],
  });

  const items = normalizeItems(newsItems);
  // Stable primitive key — avoids re-running the effect on every render.
  const itemsKey = items.map((i) => i.title).join("|");

  useEffect(() => {
    if (!items.length && !symbol) return;

    const texts = items.slice(0, 5).map((it) => it.title);
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
          setState((s) => ({ ...s, status: "done", overall: "neutral", overallScore: 0, sharePct: 0 }));
          return;
        }

        // Confidence-weighted aggregation: each headline contributes its full
        // class distribution, so a 95%-confident call counts more than a shrug.
        let bullW = 0, bearW = 0, neuW = 0;
        const enriched = results.map((r, i) => {
          const pScore = r.scores.find((s) => s.label === "positive")?.score ?? 0;
          const nScore = r.scores.find((s) => s.label === "negative")?.score ?? 0;
          const eScore = r.scores.find((s) => s.label === "neutral")?.score ?? 0;
          bullW += pScore;
          bearW += nScore;
          neuW += eScore;
          const item = items[i] ?? { title: texts[i] ?? "" };
          return {
            title: cleanTitle(item.title, item.publisher),
            url: item.url,
            publisher: item.publisher ? decodeEntities(item.publisher) : undefined,
            label: SENTIMENT_MAP[r.label],
            score: r.score,
          };
        });

        const totalW = bullW + bearW + neuW || 1;
        const overallScore = (bullW - bearW) / totalW;
        const overall = scoreToLabel(overallScore);
        const winningW = overall === "bullish" ? bullW : overall === "bearish" ? bearW : neuW;

        setState({
          status: "done",
          overall,
          overallScore,
          sharePct: Math.round((winningW / totalW) * 100),
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
    // itemsKey is a stable primitive derived from the headlines.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, itemsKey]);

  if (!items.length) return null;

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
        <span className="flex items-center gap-2">
          {state.fallback ? (
            <span
              className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              title="FinBERT model unavailable right now; scored with finance keyword rules"
            >
              Keyword estimate
            </span>
          ) : null}
          <span className={`text-sm font-bold uppercase ${colors.text}`}>
            {state.overall} · {state.sharePct}%
          </span>
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

      {/* Per-headline scores — each links to its source article */}
      <div className="space-y-1.5">
        {state.headlines.map((h, i) => {
          const hColors = h.label === "bullish" ? "text-emerald-600" : h.label === "bearish" ? "text-rose-600" : "text-amber-600";
          return (
            <div key={i} className="flex items-baseline gap-3">
              <span className={`text-xs font-bold uppercase tracking-wide ${hColors} shrink-0 w-[74px]`}>
                {h.label}
              </span>
              <span className="text-sm text-muted-foreground leading-snug line-clamp-1 min-w-0">
                {h.url ? (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-foreground"
                    title={`Open source article${h.publisher ? ` — ${h.publisher}` : ""}`}
                  >
                    {h.title}
                  </a>
                ) : (
                  h.title
                )}
                {h.publisher ? (
                  <span className="text-xs text-muted-foreground/70"> · {h.publisher}</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground text-right">
        {state.fallback
          ? "Keyword estimate (FinBERT model unavailable right now)"
          : "Powered by ProsusAI/FinBERT"}
      </p>
    </div>
  );
}
