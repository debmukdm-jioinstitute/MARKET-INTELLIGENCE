"use client";

/**
 * AI Market & News Intelligence Panel
 *
 * Multi-Pillar Market Sentiment Engine:
 * - Synthesizes Domestic Equities, Global Markets (Disparity), Commodities, Currency, and News
 * - Provides explicit, transparent financial rationale for market sentiment (+ve, -ve, neutral)
 * - Highlights cross-regional disparity (e.g. Asian resilience vs Western selloff)
 * - Renders interactive 5-Pillar Market Intelligence Matrix
 * - Displays clickable TL;DR headlines linking directly to verified source articles and PDFs
 */

import useSWR from "swr";
import Link from "next/link";
import {
  ExternalLink,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  FileText,
  Globe,
  ArrowUpRight,
  Compass,
} from "lucide-react";

type SentimentDriver = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  reason: string;
};

type MarketPillarMetric = {
  label: string;
  value: string;
  changePct?: number | null;
  isPositive?: boolean;
};

type MarketPillarCard = {
  id: "domestic" | "global" | "commodity" | "currency" | "news";
  name: string;
  icon: string;
  score: number;
  label: "positive" | "negative" | "neutral";
  impact: "+ve" | "-ve" | "neutral";
  badge: string;
  headline: string;
  details: string;
  metrics: MarketPillarMetric[];
  href: string;
};

type AggSentiment = {
  score: number;
  label: "positive" | "negative" | "neutral";
  confidence: number;
  breakdown: { positive: number; negative: number; neutral: number };
  mode?: "finbert" | "lexicon";
  rationale?: string;
  disparityNote?: string;
  pillars?: Record<"domestic" | "global" | "commodity" | "currency" | "news", MarketPillarCard>;
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
    title: "BULLISH / RISK-ON",
  },
  negative: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    title: "BEARISH / RISK-OFF",
  },
  neutral: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
    title: "BALANCED / CONSOLIDATING",
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  earnings: "📊",
  "macro-economy": "🌐",
  "monetary-policy": "🏦",
  regulatory: "⚖️",
  "deals-and-m-and-a": "🤝",
  "sector-updates": "🏭",
  "geopolitics-and-global": "🌍",
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

function PillarCard({ pillar }: { pillar: MarketPillarCard }) {
  const isPos = pillar.label === "positive";
  const isNeg = pillar.label === "negative";
  const badgeStyle = isPos
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    : isNeg
    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";

  const isInternal = pillar.href.startsWith("/");

  const CardContent = (
    <div className="group rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5 transition-all hover:border-primary/50 hover:bg-muted/20 shadow-xs h-full flex flex-col justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <span className="text-base leading-none">{pillar.icon}</span>
            <span className="truncate">{pillar.name}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}>
            {pillar.badge}
          </span>
        </div>

        <div className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors flex items-center justify-between gap-1">
          <span className="line-clamp-1">{pillar.headline}</span>
          <ArrowUpRight className="size-3 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {pillar.details}
        </p>
      </div>

      {pillar.metrics && pillar.metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/50 text-xs">
          {pillar.metrics.slice(0, 4).map((m, idx) => (
            <div key={idx} className="rounded bg-muted/40 px-2 py-1 flex items-center justify-between gap-1">
              <span className="text-xs text-muted-foreground truncate">{m.label}:</span>
              <span
                className={`font-semibold text-xs ${
                  m.changePct != null
                    ? m.isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                    : "text-foreground"
                }`}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (isInternal) {
    return (
      <Link href={pillar.href} className="block h-full">
        {CardContent}
      </Link>
    );
  }

  return (
    <a href={pillar.href} className="block h-full">
      {CardContent}
    </a>
  );
}

function SentimentMeter({ sentiment }: { sentiment: AggSentiment }) {
  const colors = SENTIMENT_COLORS[sentiment.label];
  const bullPct = Math.round(sentiment.breakdown.positive * 100);
  const bearPct = Math.round(sentiment.breakdown.negative * 100);
  const neuPct = Math.round(sentiment.breakdown.neutral * 100);
  const drivers = sentiment.drivers;
  const pillars = sentiment.pillars;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-4`}>
      {/* Top Header & Confidence Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground">
            AI Market Sentiment · Multi-Pillar Engine
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${colors.text}`}>
            {colors.title} · {Math.round(sentiment.confidence * 100)}% CONFIDENCE
          </span>
        </div>
      </div>

      {/* Score Bar with Midpoint Mark */}
      <div className="relative h-2 bg-muted/70 rounded-full overflow-hidden">
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
        <div className="absolute left-1/2 top-0 w-px h-full bg-border" />
      </div>

      {/* Breakdown Pills */}
      <div className="flex gap-2 text-sm">
        <span className="flex-1 text-center rounded-lg bg-emerald-500/10 py-1.5 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
          🐂 {bullPct}% Bullish (+ve)
        </span>
        <span className="flex-1 text-center rounded-lg bg-slate-500/10 py-1.5 text-muted-foreground font-semibold border border-border/60">
          ↔ {neuPct}% Neutral
        </span>
        <span className="flex-1 text-center rounded-lg bg-rose-500/10 py-1.5 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
          🐻 {bearPct}% Bearish (-ve)
        </span>
      </div>

      {/* Multi-Pillar Market Intelligence Matrix */}
      {pillars ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-sm font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Compass className="size-3.5 text-primary" />
              <span>Multi-Pillar Intelligence Matrix:</span>
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              Click any pillar for deeper dossier
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.domestic ? <PillarCard pillar={pillars.domestic} /> : null}
            {pillars.global ? <PillarCard pillar={pillars.global} /> : null}
            {pillars.commodity ? <PillarCard pillar={pillars.commodity} /> : null}
            {pillars.currency ? <PillarCard pillar={pillars.currency} /> : null}
            {pillars.news ? <PillarCard pillar={pillars.news} /> : null}
          </div>
        </div>
      ) : null}

      {/* Regional Disparity Callout Banner */}
      {sentiment.disparityNote ? (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1 text-sm">
          <div className="flex items-center gap-1.5 font-bold text-primary text-xs uppercase tracking-wider">
            <Globe className="size-3.5" />
            <span>Cross-Market Disparity Analysis</span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {sentiment.disparityNote}
          </p>
        </div>
      ) : null}

      {/* Synthesized Market Sentiment Explanation */}
      <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>Why is the market sentiment {sentiment.label.toUpperCase()}?</span>
        </div>

        {sentiment.rationale ? (
          <p className="text-sm text-foreground/90 leading-relaxed font-normal">
            {sentiment.rationale}
          </p>
        ) : null}

        {/* Contributing Drivers List */}
        {drivers && (drivers.positive.length > 0 || drivers.negative.length > 0 || drivers.neutral.length > 0) ? (
          <div className="pt-2.5 border-t border-border/60 space-y-2.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Key Contributing Market Catalysts:
            </span>

            {/* Bearish Catalysts */}
            {drivers.negative.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <TrendingDown className="size-3" />
                  <span>Bearish / Risk Drag Factors (-ve):</span>
                </div>
                {drivers.negative.map((d) => (
                  <DriverCard key={d.id} driver={d} type="negative" />
                ))}
              </div>
            ) : null}

            {/* Bullish Catalysts */}
            {drivers.positive.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  <span>Bullish / Resilient Drivers (+ve):</span>
                </div>
                {drivers.positive.map((d) => (
                  <DriverCard key={d.id} driver={d} type="positive" />
                ))}
              </div>
            ) : null}

            {/* Neutral Baseline */}
            {drivers.neutral.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Minus className="size-3" />
                  <span>Macro & Liquidity Baseline (↔ Neutral):</span>
                </div>
                {drivers.neutral.map((d) => (
                  <DriverCard key={d.id} driver={d} type="neutral" />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DriverCard({
  driver,
  type,
}: {
  driver: SentimentDriver;
  type: "positive" | "negative" | "neutral";
}) {
  const isInternal = driver.url.startsWith("/");
  const containerStyle =
    type === "positive"
      ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      : type === "negative"
      ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
      : "bg-muted/30 hover:bg-muted/60 border-border/60 text-muted-foreground";

  const badgeStyle =
    type === "positive"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : type === "negative"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : "bg-muted text-muted-foreground";

  const InnerContent = (
    <div className={`block p-2.5 rounded-lg border text-sm transition-colors group shadow-xs ${containerStyle}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-foreground group-hover:text-primary transition-colors flex-1 line-clamp-1">
          {driver.title}
        </span>
        {isInternal ? (
          <ArrowUpRight className="size-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
        ) : (
          <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs">
        <span className={`font-bold px-1.5 py-0.2 rounded text-xs ${badgeStyle}`}>
          {driver.sourceLabel}
        </span>
        <span className="truncate">· {driver.reason}</span>
      </div>
    </div>
  );

  if (isInternal) {
    return (
      <Link href={driver.url} className="block">
        {InnerContent}
      </Link>
    );
  }

  return (
    <a href={driver.url} target="_blank" rel="noopener noreferrer" className="block">
      {InnerContent}
    </a>
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
    <div id="news-digest" className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            AI TL;DR & News Digest — {analyzedCount} Headlines
          </span>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
          BART-large-cnn + FinBERT
        </span>
      </div>

      {/* Executive Overview Synthesis */}
      {tldr ? (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-sm text-foreground/90 leading-relaxed space-y-1">
          <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="size-3" />
            <span>Executive Brief</span>
          </div>
          <p className="text-sm leading-relaxed">{tldr}</p>
        </div>
      ) : null}

      {/* Clickable Headlines Digest List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground font-medium pt-1">
          <span>Click any headline to open verified source:</span>
          <span className="text-xs text-primary font-semibold">100% Live Links</span>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No individual headline details available.</p>
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
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex-1 leading-snug">
                      {item.title}
                    </span>
                    <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary px-2 py-0.5 rounded bg-primary/10 text-xs">
                        {item.sourceLabel || item.source.toUpperCase()}
                      </span>
                      {item.publishedAt ? (
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {timeAgo(item.publishedAt)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold px-2 py-0.5 rounded-full border text-xs ${badgeStyle}`}>
                        {isPos ? "🐂 +ve" : isNeg ? "🐻 -ve" : "↔ Neutral"}
                      </span>
                      <span className="text-muted-foreground text-xs hidden sm:inline">
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
  if (categories.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Zero-Shot Category Tags (BART-large-mnli)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs text-muted-foreground"
            title={`${c.confidence}% confidence`}
          >
            {CATEGORY_ICONS[c.category] ?? "📌"} {c.category.replace(/-/g, " ")}
            <span className="text-xs opacity-60">{c.confidence}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonPanel({ compact }: { compact: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 animate-pulse">
      <div className="h-5 w-48 bg-muted rounded" />
      <div className="h-2 w-full bg-muted rounded-full" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-muted rounded-lg" />
        <div className="h-8 flex-1 bg-muted rounded-lg" />
        <div className="h-8 flex-1 bg-muted rounded-lg" />
      </div>
      {!compact && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
        </div>
      )}
      <div className="h-24 w-full bg-muted rounded-xl" />
    </div>
  );
}

export function AiNewsIntelPanel({ compact = false }: { compact?: boolean }) {
  const { data, error, isLoading } = useSWR<NewsIntelPayload>(
    "/api/hf/news-intel",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false },
  );

  if (isLoading) return <SkeletonPanel compact={compact} />;

  if (error || !data || data.error) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        AI Market Intelligence temporarily unavailable. Using standard market feed.
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
      ? "FinBERT + Multi-Pillar Engine"
      : "Multi-Pillar Market Engine";

  if (compact) {
    return (
      <div className="space-y-4">
        <SentimentMeter sentiment={data.sentiment} />
        <TldrCard tldr={data.tldr} items={data.items} analyzedCount={data.analyzedCount} />
        <p className="text-right text-xs text-muted-foreground">
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
      <p className="text-right text-xs text-muted-foreground">
        Sentiment: {poweredBy} · Summary: facebook/BART-large-cnn · Categories: BART-large-mnli ·{" "}
        {asOf} IST
      </p>
    </div>
  );
}
