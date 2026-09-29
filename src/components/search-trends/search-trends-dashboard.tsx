"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useSearchTrendHub } from "@/hooks/use-search-trends-hub";
import type { SearchTrendCategory, SearchTrendSeries } from "@/lib/search-trends/types";
import { SEARCH_TREND_CATEGORY_LABELS } from "@/lib/search-trends/types";
import { cn } from "@/lib/utils";
import { ExternalLink, RefreshCw, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

const CATEGORIES = Object.keys(SEARCH_TREND_CATEGORY_LABELS) as SearchTrendCategory[];

function trendBadge(label: SearchTrendSeries["trendLabel"]) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
        label === "surging" && "bg-rose-500/15 text-rose-700",
        label === "rising" && "bg-amber-500/15 text-amber-800",
        label === "stable" && "bg-muted text-muted-foreground",
        label === "cooling" && "bg-sky-500/15 text-sky-800",
        label === "fading" && "bg-emerald-500/15 text-emerald-700",
      )}
    >
      {label}
    </span>
  );
}

function Sparkline({ series }: { series: SearchTrendSeries }) {
  const data = series.timeline.map((p) => ({ v: p.value }));
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke="#1a73e8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SearchTrendsDashboard() {
  const [category, setCategory] = useState<SearchTrendCategory | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, loading, error, reload } = useSearchTrendHub({
    category: category === "all" ? undefined : category,
    keyword: submitted || undefined,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const rows = [...data.series].sort((a, b) => b.attentionIndex - a.attentionIndex);
    return rows;
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Search-trend intelligence"
        subtitle="Google Trends search interest → Attention Index across companies, IPOs, sectors, commodities, macro, policy, leaders, and products (India geo by default)."
      />

      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(keyword.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Track a custom query on Google Trends…"
            className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Track query
        </button>
        <button
          type="button"
          onClick={() => reload()}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-border px-4 text-sm font-medium"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            category === "all" ? "border-primary bg-accent text-primary" : "border-border",
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              category === c ? "border-primary bg-accent text-primary" : "border-border",
            )}
          >
            {SEARCH_TREND_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {loading && !data ? <p className="mt-6 text-sm text-muted-foreground">Loading Google Trends…</p> : null}

      {data ? (
        <>
          <p className="mt-4 text-sm text-muted-foreground">{data.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">{data.methodology}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.categoryAverages
              .filter((c) => c.count > 0)
              .sort((a, b) => b.attentionIndex - a.attentionIndex)
              .slice(0, 8)
              .map((c) => (
                <div key={c.category} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{c.attentionIndex}</p>
                  <p className="text-xs text-muted-foreground">Avg Attention · {c.count} tracked</p>
                </div>
              ))}
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Attention</th>
                  <th className="px-4 py-3">Momentum</th>
                  <th className="px-4 py-3">Trend</th>
                  <th className="px-4 py-3">12w</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{row.item.label}</div>
                      <div className="text-xs text-muted-foreground">{row.item.keyword}</div>
                      {row.item.symbol ? (
                        <Link href={`/research/${encodeURIComponent(row.item.symbol)}`} className="text-xs font-medium text-primary hover:underline">
                          {row.item.symbol} dossier
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{SEARCH_TREND_CATEGORY_LABELS[row.item.category]}</td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-semibold tabular-nums">{row.attentionIndex}</span>
                      <span className="ml-1 text-xs text-muted-foreground">/ 100</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.momentumPct >= 0 ? "+" : ""}
                      {row.momentumPct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">{trendBadge(row.trendLabel)}</td>
                    <td className="px-4 py-3">
                      <Sparkline series={row} />
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={row.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        {row.source.mode === "live" ? "Google Trends" : "Fallback"}
                        <ExternalLink className="size-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-4 text-primary" />
                Top Attention
              </h2>
              <ul className="mt-3 space-y-2">
                {data.topAttention.map((s) => (
                  <li key={s.item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{s.item.label}</span>
                    <span className="font-semibold tabular-nums">{s.attentionIndex}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Fastest momentum</h2>
              <ul className="mt-3 space-y-2">
                {data.topMomentum.map((s) => (
                  <li key={s.item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{s.item.label}</span>
                    <span className="font-semibold tabular-nums">+{s.momentumPct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
