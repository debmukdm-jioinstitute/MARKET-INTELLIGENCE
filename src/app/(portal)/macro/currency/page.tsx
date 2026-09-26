"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import {
  CurrencyFocusToggle,
  type CurrencyFocusFilter,
} from "@/components/macro/currency-focus-toggle";
import { MacroTapeSkeleton } from "@/components/macro/macro-tape-skeleton";
import { MetricExplainer } from "@/components/macro/metric-explainer";
import { useMacroTape } from "@/hooks/use-macro-tape";
import type { TapeQuote } from "@/lib/macro/build-tape";
import {
  CURRENCY_CATEGORY_LABEL,
  CURRENCY_FOCUS_LABEL,
  CURRENCY_UNIVERSE,
  currencyFocusCounts,
  formatCurrencyPrice,
  parseCurrencyFocusParam,
  type CurrencyCategory,
  type CurrencyDef,
} from "@/lib/macro/currency-universe";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const CATEGORY_ORDER: CurrencyCategory[] = ["india_inr", "usd_majors", "global_cross", "emerging_usd"];

const CATEGORIES_BY_FOCUS: Record<CurrencyFocusFilter, CurrencyCategory[] | "all"> = {
  all: "all",
  global: ["global_cross", "emerging_usd"],
  us: ["usd_majors"],
  india: ["india_inr"],
};

function changePctClass(pct: number | null) {
  if (pct == null) return "text-muted-foreground";
  return pct >= 0 ? "text-chart-2" : "text-destructive";
}

function CurrencyCard({
  def,
  quote,
  hist,
}: {
  def: CurrencyDef;
  quote?: TapeQuote;
  hist?: { date: string; v: number }[];
}) {
  const price = quote?.price ?? null;
  const changePct = quote?.changePct ?? null;
  const sourceUrl = quote?.source.url ?? `https://finance.yahoo.com/quote/${encodeURIComponent(def.sym)}`;
  const provider = quote?.source.provider ?? "Yahoo Finance";

  return (
    <Panel id={def.id} title={def.label} subtitle={`${def.unit} · ${CURRENCY_FOCUS_LABEL[def.focus]}`}>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-2xl font-semibold tabular-nums">{formatCurrencyPrice(def, price)}</p>
        <span className={cn("text-sm font-medium tabular-nums", changePctClass(changePct))}>
          {changePct != null ? `${changePct >= 0 ? "+" : ""}${(changePct * 100).toFixed(2)}%` : "—"}
        </span>
        <MetricExplainer copyKey={def.copyKey} />
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary">
          {provider}
        </a>
      </div>
      {hist?.length ? (
        <div className="mt-4 h-[180px]">
          <Lines data={hist} keys={[{ key: "v", color: "var(--primary)", name: def.label }]} />
        </div>
      ) : price != null ? (
        <p className="mt-3 text-xs text-muted-foreground">6-month chart loading…</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Quote unavailable — retry after refresh.</p>
      )}
    </Panel>
  );
}

export default function CurrencyMacroPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, loading, error, reload } = useMacroTape();
  const [hist, setHist] = useState<Record<string, { date: string; v: number }[]>>({});

  const focusFromUrl = parseCurrencyFocusParam(searchParams.get("focus"));
  const [focus, setFocusState] = useState<CurrencyFocusFilter>(focusFromUrl ?? "all");

  useEffect(() => {
    const parsed = parseCurrencyFocusParam(searchParams.get("focus"));
    if (parsed) setFocusState(parsed);
  }, [searchParams]);

  const setFocus = useCallback(
    (next: CurrencyFocusFilter) => {
      setFocusState(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("focus");
      else params.set("focus", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const focusCounts = useMemo(() => currencyFocusCounts(), []);

  const quoteById = useMemo(() => new Map((data?.currencies ?? []).map((q) => [q.id, q])), [data?.currencies]);

  const visibleDefs = useMemo(() => {
    const byFocus = focus === "all" ? CURRENCY_UNIVERSE : CURRENCY_UNIVERSE.filter((d) => d.focus === focus);
    const catFilter = CATEGORIES_BY_FOCUS[focus];
    if (catFilter === "all") return byFocus;
    return byFocus.filter((d) => catFilter.includes(d.category));
  }, [focus]);

  const defsByCategory = useMemo(() => {
    const map = new Map<CurrencyCategory, CurrencyDef[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const d of visibleDefs) {
      map.get(d.category)?.push(d);
    }
    return map;
  }, [visibleDefs]);

  const categoriesToRender = useMemo(() => {
    const allowed = CATEGORIES_BY_FOCUS[focus];
    if (allowed === "all") return CATEGORY_ORDER;
    return CATEGORY_ORDER.filter((c) => allowed.includes(c));
  }, [focus]);

  useEffect(() => {
    if (!visibleDefs.length) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        visibleDefs.map(async (def) => {
          try {
            const res = await fetch(`/api/feeds/yahoo/history?symbol=${encodeURIComponent(def.sym)}&range=6mo`);
            if (!res.ok) return [def.id, [] as { date: string; v: number }[]] as const;
            const json = (await res.json()) as { points?: { date: string; value: number }[] };
            return [def.id, (json.points ?? []).map((p) => ({ date: p.date, v: p.value }))] as const;
          } catch {
            return [def.id, [] as { date: string; v: number }[]] as const;
          }
        }),
      );
      if (cancelled) return;
      setHist((prev) => {
        const out = { ...prev };
        for (const [id, points] of results) out[id] = points;
        return out;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [visibleDefs]);

  const { global: globalCount, us: usCount, india: indiaCount } = focusCounts;

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Macro"
        title="Currency dashboard"
        subtitle={`${focusCounts.all} pairs — ${indiaCount} INR crosses, ${usCount} USD bloc, ${globalCount} global & EM. Yahoo Finance spot; RBI reference on Intelligence hub.`}
      />

      <CurrencyFocusToggle value={focus} onChange={setFocus} counts={focusCounts} className="mt-4" />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href="/macro" className="text-sm text-primary hover:underline">
          ← Macro home
        </Link>
        <button type="button" onClick={() => reload()} className="text-sm text-muted-foreground hover:text-primary">
          Refresh tape
        </button>
        {focus !== "all" ? (
          <span className="text-xs text-muted-foreground">
            Showing {CURRENCY_FOCUS_LABEL[focus]} only · {visibleDefs.length} cards
          </span>
        ) : null}
      </div>

      {loading && !data ? <MacroTapeSkeleton count={6} /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {categoriesToRender.map((cat) => {
        const defs = defsByCategory.get(cat) ?? [];
        if (!defs.length) return null;
        return (
          <section key={cat} className="mt-8 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">{CURRENCY_CATEGORY_LABEL[cat]}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {defs.map((def) => (
                <CurrencyCard key={def.id} def={def} quote={quoteById.get(def.id)} hist={hist[def.id]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
