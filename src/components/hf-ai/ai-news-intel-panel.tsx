"use client";

/**
 * AI News Intelligence Panel
 *
 * Displays FinBERT-powered market sentiment with explicit sentiment rationale (+ve, -ve, neutral drivers)
 * and interactive, clickable TL;DR headlines linking directly to verified source articles and PDFs.
 */

import useSWR from "swr";
import {
  ExternalLink,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  FileText,
} from "lucide-react";

type SentimentDriver = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  reason: string;
};

type AggSentiment = {
  score: number;
  label: "positive" | "negative" | "neutral";
  confidence: number;
  breakdown: { positive: number; negative: number; neutral: number };
  mode?: "finbert" | "lexicon";
  rationale?: string;
  drivers?: {
    positive: SentimentDriver[];
    negative: SentimentDriver[];
    neutral: SentimentDriver[];
  };
};

type NewsIntelItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  publishedAt?: string;
  sentiment: {
    label: "positive" | "negative" | "neutral";
    score: number;
    impact: "+ve" | "-ve" | "neutral";
    reason: string;
  };
  category?: string;
};

type CategoryItem = {
  headline: string;
  category: string;
  confidence: number;
};

type NewsIntelPayload = {
  sentiment: AggSentiment;
  tldr: string | null;
  items?: NewsIntelItem[];
  categories: CategoryItem[];
  analyzedCount: number;
  asOf: string;
  noNews?: boolean;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<NewsIntelPayload>);

const SENTIMENT_COLORS = {
  positive: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  negative: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  neutral: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
  },
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

function timeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Recent";
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return "Recent";
  }
}

function SentimentMeter({ sentiment }: { sentiment: AggSentiment }) {
  const colors = SENTIMENT_COLORS[sentiment.label];
  const bullPct = Math.round(sentiment.breakdown.positive * 100);
  const bearPct = Math.round(sentiment.breakdown.negative * 100);
  const neuPct = Math.round(sentiment.breakdown.neutral * 100);
  const drivers = sentiment.drivers;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-3.5`}>
      <div className="flex items-center justify-between">
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
      <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden">
        <div
          className="absolute h-full transition-all duration-700"
          style={{
            left: "50%",
            width: `${Math.max(Math.abs(sentiment.score) * 50, 6)}%`,
            transform: sentiment.score >= 0 ? "none" : "translateX(-100%)",
            background:
              sentiment.score >= 0
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #f87171, #ef4444)",
          }}
        />
        <div className="absolute left-1/2 top-0 w-px h-full bg-border/60" />
      </div>

      {/* Breakdown pills */}
      <div className="flex gap-2 text-xs">
        <span className="flex-1 text-center rounded-lg bg-emerald-500/10 py-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          🐂 {bullPct}% Bullish (+ve)
        </span>
        <span className="flex-1 text-center rounded-lg bg-slate-500/10 py-1.5 text-muted-foreground font-semibold">
          ↔ {neuPct}% Neutral
        </span>
        <span className="flex-1 text-center rounded-lg bg-rose-500/10 py-1.5 text-rose-600 dark:text-rose-400 font-semibold">
          🐻 {bearPct}% Bearish (-ve)
        </span>
      </div>

      {/* Sentiment Driver Attribution & Explanation */}
      <div className="p-3 rounded-lg bg-card/80 border border-border/60 space-y-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>Why is the market sentiment {sentiment.label.toUpperCase()}?</span>
        </div>

        {sentiment.rationale ? (
          <p className="text-xs text-foreground/90 leading-relaxed font-normal">
            {sentiment.rationale}
          </p>
        ) : null}

        {/* Contributing Drivers List */}
        {drivers && (drivers.positive.length > 0 || drivers.negative.length > 0 || drivers.neutral.length > 0) ? (
          <div className="pt-2 border-t border-border/40 space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Key Contributing News Drivers:
            </span>

            {/* Bullish Catalysts */}
            {drivers.positive.length > 0 ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  <span>Bullish Drivers (+ve):</span>
                </div>
                {drivers.positive.slice(0, 2).map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-md bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 text-xs transition-colors group"
                    title={`Open source: ${d.sourceLabel}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors flex-1 line-clamp-1">
                        {d.title}
                      </span>
                      <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <span className="font-semibold px-1 rounded bg-emerald-500/10 text-[10px]">{d.sourceLabel}</span>
                      <span>· {d.reason}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}

            {/* Bearish Catalysts */}
            {drivers.negative.length > 0 ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <TrendingDown className="size-3" />
                  <span>Bearish / Risk Drag (-ve):</span>
                </div>
                {drivers.negative.slice(0, 2).map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-md bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 text-xs transition-colors group"
                    title={`Open source: ${d.sourceLabel}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors flex-1 line-clamp-1">
                        {d.title}
                      </span>
                      <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                      <span className="font-semibold px-1 rounded bg-rose-500/10 text-[10px]">{d.sourceLabel}</span>
                      <span>· {d.reason}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}

            {/* Neutral Baseline */}
            {drivers.neutral.length > 0 ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Minus className="size-3" />
                  <span>Macro & Liquidity Baseline (↔ Neutral):</span>
                </div>
                {drivers.neutral.slice(0, 2).map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-md bg-muted/40 hover:bg-muted/70 border border-border/60 text-xs transition-colors group"
                    title={`Open source: ${d.sourceLabel}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors flex-1 line-clamp-1">
                        {d.title}
                      </span>
                      <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold px-1 rounded bg-muted text-[10px]">{d.sourceLabel}</span>
                      <span>· {d.reason}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TldrCard({
  tldr,
  items = [],
  analyzedCount,
}: {
  tldr: string | null;
  items?: NewsIntelItem[];
  analyzedCount: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI TL;DR & News Digest — {analyzedCount} Headlines
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 font-sans">
          BART-large-cnn + FinBERT
        </span>
      </div>

      {/* Executive Overview Synthesis */}
      {tldr ? (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs text-foreground/90 leading-relaxed space-y-1">
          <div className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="size-3" />
            <span>Executive Brief</span>
          </div>
          <p className="text-xs leading-relaxed">{tldr}</p>
        </div>
      ) : null}

      {/* Clickable Headlines Digest List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-1">
          <span>Click any headline to open verified source:</span>
          <span className="text-[10px] text-primary">Live Links</span>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No individual headline details available.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isPos = item.sentiment.label === "positive";
              const isNeg = item.sentiment.label === "negative";
              const badgeStyle = isPos
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : isNeg
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";

              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-3 rounded-xl border border-border/60 bg-muted/10 hover:border-primary/50 hover:bg-muted/30 transition-all shadow-xs"
                  title={`Open original source on ${item.sourceLabel || item.source}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex-1 leading-snug">
                      {item.title}
                    </span>
                    <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary px-2 py-0.5 rounded bg-primary/10 text-[10px]">
                        {item.sourceLabel || item.source.toUpperCase()}
                      </span>
                      {item.publishedAt ? (
                        <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {timeAgo(item.publishedAt)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold px-2 py-0.5 rounded-full border text-[10px] ${badgeStyle}`}>
                        {isPos ? "🐂 +ve" : isNeg ? "🐻 -ve" : "↔ Neutral"}
                      </span>
                      <span className="text-muted-foreground text-[11px] hidden sm:inline">
                        · {item.sentiment.reason}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
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
            {CATEGORY_ICONS[c.category] ?? "📌"} {c.category.replace(/-/g, " ")}
            <span className="text-[10px] opacity-60 font-sans">{c.confidence}%</span>
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
      : "Financial lexicon (add HF_TOKEN for FinBERT)";

  if (compact) {
    return (
      <div className="space-y-4">
        <SentimentMeter sentiment={data.sentiment} />
        <TldrCard tldr={data.tldr} items={data.items} analyzedCount={data.analyzedCount} />
        <p className="text-right text-[10px] text-muted-foreground font-sans">
          Powered by {poweredBy} · Updated {asOf} IST
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SentimentMeter sentiment={data.sentiment} />
      <TldrCard tldr={data.tldr} items={data.items} analyzedCount={data.analyzedCount} />
      <CategoryTags categories={data.categories} />
      <p className="text-right text-[10px] text-muted-foreground font-sans">
        Sentiment: {poweredBy} · Summary: facebook/BART-large-cnn · Categories: BART-large-mnli ·{" "}
        {asOf} IST
      </p>
    </div>
  );
}
