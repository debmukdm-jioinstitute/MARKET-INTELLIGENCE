"use client";

/**
 * AI News Intelligence Panel
 *
 * Displays FinBERT-powered market sentiment + BART TL;DR from the /api/hf/news-intel endpoint.
 * Designed as a reusable widget for the Home, Brief, and Research pages.
 */

import useSWR from "swr";

type AggSentiment = {
  score: number;
  label: "positive" | "negative" | "neutral";
  confidence: number;
  breakdown: { positive: number; negative: number; neutral: number };
  mode?: "finbert" | "lexicon";
};

type CategoryItem = {
  headline: string;
  category: string;
  confidence: number;
};

type NewsIntelPayload = {
  sentiment: AggSentiment;
  tldr: string | null;
  categories: CategoryItem[];
  analyzedCount: number;
  asOf: string;
  noNews?: boolean;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<NewsIntelPayload>);

const SENTIMENT_COLORS = {
  positive: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600", dot: "bg-emerald-500" },
  negative: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-600", dot: "bg-rose-500" },
  neutral: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600", dot: "bg-amber-400" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "monetary-policy": "🏦",
  earnings: "📈",
  "merger-acquisition": "🤝",
  ipo: "🚀",
  regulatory: "⚖️",
  "macro-economy": "🌐",
  commodity: "🛢️",
  currency: "💱",
  geopolitics: "🌍",
  "corporate-governance": "🏛️",
  "credit-rating": "📊",
  "mutual-fund": "💼",
  "technical-analysis": "📉",
};

function SentimentMeter({ sentiment }: { sentiment: AggSentiment }) {
  const colors = SENTIMENT_COLORS[sentiment.label];
  const scorePercent = ((sentiment.score + 1) / 2) * 100; // map -1..1 → 0..100
  const bullPct = Math.round(sentiment.breakdown.positive * 100);
  const bearPct = Math.round(sentiment.breakdown.negative * 100);
  const neuPct = Math.round(sentiment.breakdown.neutral * 100);

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI Market Sentiment
          </span>
        </div>
        <span className={`text-xs font-bold uppercase ${colors.text}`}>
          {sentiment.label} · {Math.round(sentiment.confidence * 100)}% confidence
        </span>
      </div>

      {/* Score bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="absolute h-full transition-all duration-700"
          style={{
            left: "50%",
            width: `${Math.abs(sentiment.score) * 50}%`,
            transform: sentiment.score >= 0 ? "none" : "translateX(-100%)",
            background: sentiment.score >= 0
              ? "linear-gradient(90deg, #10b981, #34d399)"
              : "linear-gradient(90deg, #f87171, #ef4444)",
          }}
        />
        <div className="absolute left-1/2 top-0 w-px h-full bg-border/60" />
      </div>

      {/* Breakdown pills */}
      <div className="flex gap-2 text-xs">
        <span className="flex-1 text-center rounded-lg bg-emerald-500/10 py-1 text-emerald-600 font-medium">
          🐂 {bullPct}%
        </span>
        <span className="flex-1 text-center rounded-lg bg-slate-500/10 py-1 text-muted-foreground font-medium">
          ↔ {neuPct}%
        </span>
        <span className="flex-1 text-center rounded-lg bg-rose-500/10 py-1 text-rose-600 font-medium">
          🐻 {bearPct}%
        </span>
      </div>
    </div>
  );
}

function TldrCard({ tldr, analyzedCount }: { tldr: string; analyzedCount: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">✨</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI TL;DR — {analyzedCount} headlines
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
          BART-large-cnn
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{tldr}</p>
    </div>
  );
}

function CategoryTags({ categories }: { categories: CategoryItem[] }) {
  if (!categories.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Topics in today&apos;s news
      </p>
      <div className="flex flex-wrap gap-1.5">
        {categories.slice(0, 8).map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground"
            title={`${c.confidence}% confidence`}
          >
            {CATEGORY_ICONS[c.category] ?? "📌"}{" "}
            {c.category.replace(/-/g, " ")}
            <span className="text-[10px] opacity-60">{c.confidence}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AiNewsIntelPanel({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, error } = useSWR<NewsIntelPayload>("/api/hf/news-intel", fetcher, {
    refreshInterval: 600_000, // 10 min
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-muted/10 p-4 animate-pulse space-y-3">
        <div className="h-3 bg-muted rounded w-40" />
        <div className="h-2 bg-muted rounded" />
        <div className="h-2 bg-muted rounded w-3/4" />
      </div>
    );
  }

  if (error || !data || data.error) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          AI news analysis temporarily unavailable
        </p>
      </div>
    );
  }

  if (data.noNews || data.analyzedCount === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          No headlines in the intelligence feed yet — sentiment updates when news loads.
        </p>
      </div>
    );
  }

  const asOf = new Date(data.asOf).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });

  const poweredBy =
    data.sentiment.mode === "finbert"
      ? "ProsusAI/FinBERT"
      : "Keyword lexicon (add HF_TOKEN for FinBERT)";

  if (compact) {
    return (
      <div className="space-y-3">
        <SentimentMeter sentiment={data.sentiment} />
        {data.tldr ? <TldrCard tldr={data.tldr} analyzedCount={data.analyzedCount} /> : null}
        <p className="text-right text-[10px] text-muted-foreground">
          Powered by {poweredBy} · Updated {asOf} IST
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SentimentMeter sentiment={data.sentiment} />
      {data.tldr ? <TldrCard tldr={data.tldr} analyzedCount={data.analyzedCount} /> : null}
      <CategoryTags categories={data.categories} />
      <p className="text-right text-[10px] text-muted-foreground">
        Sentiment: {poweredBy} · Summary: facebook/BART-large-cnn when HF_TOKEN set · Categories: BART-large-mnli ·{" "}
        {asOf} IST
      </p>
    </div>
  );
}
