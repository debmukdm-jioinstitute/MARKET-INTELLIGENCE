"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import {
  IndicesFocusToggle,
  type IndexFocusFilter,
} from "@/components/macro/indices-focus-toggle";
import { MacroTapeSkeleton } from "@/components/macro/macro-tape-skeleton";
import { MetricExplainer } from "@/components/macro/metric-explainer";
import { useWorldIndices } from "@/hooks/use-world-indices";
import type { WorldIndexQuote } from "@/lib/macro/build-world-indices";
import {
  INDEX_CATEGORY_LABEL,
  INDEX_UNIVERSE,
  categoriesForFocus,
  formatIndexPrice,
  formatIndexRange,
  formatIndexVolume,
  indexFocusCounts,
  parseIndexFocusParam,
  type IndexCategory,
} from "@/lib/macro/indices-universe";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

const defById = new Map(INDEX_UNIVERSE.map((d) => [d.id, d]));

function changePctClass(pct: number | null) {
  if (pct == null) return "text-muted-foreground";
  return pct >= 0 ? "text-chart-2" : "text-destructive";
}

function IndexTable({ rows }: { rows: WorldIndexQuote[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hist, setHist] = useState<Record<string, { date: string; v: number }[]>>({});

  useEffect(() => {
    if (!expandedId) return;
    const def = defById.get(expandedId);
    if (!def || hist[expandedId]?.length) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/feeds/yahoo/history?symbol=${encodeURIComponent(def.sym)}&range=6mo`);
        if (!res.ok) return;
        const json = (await res.json()) as { points?: { date: string; value: number }[] };
        if (cancelled) return;
        setHist((prev) => ({
          ...prev,
          [expandedId]: (json.points ?? []).map((p) => ({ date: p.date, v: p.value })),
        }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedId, hist]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-semibold">Index</th>
            <th className="px-3 py-2.5 text-right font-semibold">Price</th>
            <th className="px-3 py-2.5 text-right font-semibold">Change</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">Change %</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">Volume</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold xl:table-cell">Day range</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold xl:table-cell">52 wk range</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const def = defById.get(row.id);
            const expanded = expandedId === row.id;
            return (
              <Fragment key={row.id}>
                <tr
                  id={row.id}
                  className={cn(
                    "border-b border-border/60 transition-colors hover:bg-muted/30",
                    expanded && "bg-muted/20",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="flex max-w-[240px] flex-col items-start gap-0.5 text-left"
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                    >
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        {row.label}
                        <MetricExplainer copyKey={row.copyKey} />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.symbol} · {row.region}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    {def ? formatIndexPrice(def, row.price) : row.price?.toFixed(2) ?? "—"}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", changePctClass(row.changePct))}>
                    {row.change != null
                      ? `${row.change >= 0 ? "+" : ""}${row.change.toLocaleString("en-US", { maximumFractionDigits: def?.decimals ?? 2 })}`
                      : "—"}
                  </td>
                  <td className={cn("hidden px-3 py-2.5 text-right tabular-nums md:table-cell", changePctClass(row.changePct))}>
                    {row.changePct != null ? `${row.changePct >= 0 ? "+" : ""}${(row.changePct * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground lg:table-cell">
                    {formatIndexVolume(row.volume)}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground xl:table-cell">
                    {formatIndexRange(row.dayLow, row.dayHigh, def?.decimals ?? 2)}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground xl:table-cell">
                    {formatIndexRange(row.week52Low, row.week52High, def?.decimals ?? 2)}
                  </td>
                </tr>
                {expanded ? (
                  <tr key={`${row.id}-chart`} className="border-b border-border/60 bg-card">
                    <td colSpan={7} className="px-3 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">6-month trend · click row to collapse</p>
                        <a
                          href={row.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Yahoo Finance ↗
                        </a>
                      </div>
                      <div className="mt-3 h-[200px]">
                        {hist[row.id]?.length ? (
                          <Lines
                            data={hist[row.id]}
                            keys={[{ key: "v", color: "var(--primary)", name: row.label }]}
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">Loading chart…</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function WorldIndicesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, loading, error, reload } = useWorldIndices();

  const focusFromUrl = parseIndexFocusParam(searchParams.get("focus"));
  const [focus, setFocusState] = useState<IndexFocusFilter>(focusFromUrl ?? "all");

  useEffect(() => {
    const parsed = parseIndexFocusParam(searchParams.get("focus"));
    if (parsed) setFocusState(parsed);
  }, [searchParams]);

  const setFocus = useCallback(
    (next: IndexFocusFilter) => {
      setFocusState(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("focus");
      else params.set("focus", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const focusCounts = useMemo(() => indexFocusCounts(), []);

  const visibleCategories = useMemo(() => categoriesForFocus(focus), [focus]);

  const rowsByCategory = useMemo(() => {
    const map = new Map<IndexCategory, WorldIndexQuote[]>();
    for (const cat of visibleCategories) map.set(cat, []);
    const quotes = data?.indices ?? [];
    for (const q of quotes) {
      if (!visibleCategories.includes(q.category)) continue;
      if (focus !== "all" && q.focus !== "volatility" && q.focus !== focus) continue;
      map.get(q.category)?.push(q);
    }
    return map;
  }, [data?.indices, focus, visibleCategories]);

  const visibleCount = useMemo(
    () => [...rowsByCategory.values()].reduce((n, rows) => n + rows.length, 0),
    [rowsByCategory],
  );

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Macro"
        title="World stock indices"
        subtitle={`${focusCounts.all} benchmarks — live price, day change, volume, intraday and 52-week ranges (Yahoo Finance). Same coverage as Yahoo world indices, tuned for India-first context.`}
      />

      <IndicesFocusToggle value={focus} onChange={setFocus} counts={focusCounts} className="mt-4" />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href="/macro" className="text-sm text-primary hover:underline">
          ← Macro home
        </Link>
        <Link href="/macro/global" className="text-sm text-primary hover:underline">
          Global macro data
        </Link>
        <button type="button" onClick={() => reload()} className="text-sm text-muted-foreground hover:text-primary">
          Refresh quotes
        </button>
        {focus !== "all" ? (
          <span className="text-xs text-muted-foreground">Showing {visibleCount} indices in this region (+ volatility)</span>
        ) : null}
        {data?.fetchedAt ? (
          <span className="text-xs text-muted-foreground">
            Updated {new Date(data.fetchedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      {loading && !data ? <MacroTapeSkeleton count={4} /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {visibleCategories.map((cat) => {
        const rows = rowsByCategory.get(cat) ?? [];
        if (!rows.length) return null;
        return (
          <section key={cat} className="mt-8 space-y-3">
            <h2 className="font-heading text-lg font-bold text-foreground">{INDEX_CATEGORY_LABEL[cat]}</h2>
            <IndexTable rows={rows} />
          </section>
        );
      })}

      {!loading && data && visibleCount === 0 ? (
        <Panel title="No quotes" className="mt-8">
          <p className="text-sm text-muted-foreground">Try refresh or switch region focus.</p>
        </Panel>
      ) : null}
    </div>
  );
}
