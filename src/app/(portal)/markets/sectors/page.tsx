"use client";

import { Suspense, useMemo } from "react";
import { useUrlQueryEnum } from "@/lib/react/use-url-query-enum";
import { MarketValuationCard } from "@/components/dashboard/market-valuation-card";
import { PageHeader } from "@/components/layout/page-header";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { useIndiaBoardQuotes } from "@/hooks/use-india-board-quotes";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INDIA_BENCHMARK_DEFS } from "@/lib/feeds/india/indices";
import { overlayIndiaBoardFields } from "@/lib/macro/build-india-board-quotes";
import { indexSlugFromLabel } from "@/lib/india-index-meta";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";
import Link from "next/link";
import { MetricInfo } from "@/components/ui/metric-info";

type SectorTab = "performance" | "valuation";
const SECTOR_TABS: SectorTab[] = ["performance", "valuation"];

/** NSE sectoral and thematic indices shown in the matrix. Every number comes from the live index feed. */
const SECTOR_INDEX_LABELS = [
  "Nifty Bank", "Nifty Fin", "Nifty Pvt Bank", "Nifty PSU Bank", "Nifty IT", "Nifty Pharma", "Nifty Healthcare",
  "Nifty Auto", "Nifty FMCG", "Nifty Metal", "Nifty Energy", "Nifty Realty", "Nifty Infra", "Nifty Media",
  "Nifty PSE", "Nifty Commodities", "Nifty Consumption", "Nifty Mfg",
] as const;

const fmt = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);
const tone = (n: number | null | undefined) => (n == null ? "text-muted-foreground" : n >= 0 ? "text-emerald-600" : "text-rose-600");

function EquityRiskPremiumPanel() {
  const { data } = useIndiaDashboard(60_000);
  const gsec = data?.pulse?.gsec10y?.value;
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm shadow-sm">
      <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Scale className="size-4 text-primary" />
        EQUITY RISK PREMIUM & YIELD SPREAD
      </h3>
      <p className="text-muted-foreground text-sm">
        Earnings yield needs index P/E from NSE — not auto-scraped. G-Sec is live when dashboard loads.
      </p>
      <div className="space-y-3 divide-y divide-border/50">
        <div className="pt-2 first:pt-0 flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1">
            NIFTY Earnings Yield (1 / PE):
            <MetricInfo id="earnings_yield" iconSize="xs" />
          </span>
          <span className="font-bold text-muted-foreground">—</span>
        </div>
        <div className="pt-2 flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1">
            India 10Y G-Sec Yield:
            <MetricInfo id="gsec10y" iconSize="xs" />
          </span>
          <span className="font-bold text-foreground tabular-nums">{gsec != null ? `${gsec.toFixed(2)}%` : "—"}</span>
        </div>
        <div className="pt-2 flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1">
            Yield spread vs earnings yield:
            <MetricInfo id="yield_spread" iconSize="xs" />
          </span>
          <span className="font-bold text-muted-foreground">—</span>
        </div>
      </div>
    </div>
  );
}


type SectorRow = {
  label: string;
  slug: string | null;
  price: number | null;
  changePct: number | null;
  relToNifty: number | null;
  week52Low: number | null;
  week52High: number | null;
  /** 0-100: where the last price sits inside its 52-week range. */
  rangePos: number | null;
};

function SectorMatrix() {
  const { data: feed, loading, error } = useFeedHub(30_000);
  const { data: board } = useIndiaBoardQuotes();
  const rows = useMemo<SectorRow[]>(() => {
    const indices = feed?.indices ?? [];
    const nifty = indices.find((i) => i.symbol === "Nifty 50")?.changePct ?? null;
    return SECTOR_INDEX_LABELS.map((label) => {
      const q = indices.find((i) => i.symbol === label);
      const def = INDIA_BENCHMARK_DEFS.find((d) => d.label === label);
      const r = overlayIndiaBoardFields(def?.yahoo, board?.bySymbol ?? {});
      const price = q?.price ?? null;
      const lo = r.week52Low ?? null;
      const hi = r.week52High ?? null;
      return {
        label,
        slug: indexSlugFromLabel(label),
        price,
        changePct: q?.changePct ?? null,
        relToNifty: q?.changePct != null && nifty != null ? q.changePct - nifty : null,
        week52Low: lo,
        week52High: hi,
        rangePos: price != null && lo != null && hi != null && hi > lo ? ((price - lo) / (hi - lo)) * 100 : null,
      };
    }).sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity));
  }, [feed?.indices, board?.bySymbol]);

  if (loading && !rows.some((r) => r.price != null)) return <p className="p-6 text-sm text-muted-foreground">Loading live sector indices…</p>;
  if (error && !rows.some((r) => r.price != null)) return <p className="p-6 text-sm text-rose-600">Live sector indices unavailable: {error}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sector index</TableHead>
          <TableHead className="text-right">Last</TableHead>
          <TableHead className="text-right">Day change</TableHead>
          <TableHead className="text-right">vs Nifty 50 today</TableHead>
          <TableHead className="text-right">52W low</TableHead>
          <TableHead className="text-right">52W high</TableHead>
          <TableHead className="text-right">Position in 52W range</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.label} className="text-sm hover:bg-accent/40">
            <TableCell className="font-bold text-foreground">
              {s.slug ? <Link href={`/markets/india/${s.slug}`} className="hover:text-primary hover:underline">{s.label}</Link> : s.label}
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmt(s.price)}</TableCell>
            <TableCell className={cn("text-right font-bold tabular-nums", tone(s.changePct))}>{signed(s.changePct)}</TableCell>
            <TableCell className={cn("text-right tabular-nums", tone(s.relToNifty))}>{signed(s.relToNifty)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(s.week52Low)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(s.week52High)}</TableCell>
            <TableCell className="text-right tabular-nums">{s.rangePos != null ? `${s.rangePos.toFixed(0)}%` : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function SectorsPage() {
  return (
    <Suspense fallback={null}>
      <SectorsView />
    </Suspense>
  );
}

function SectorsView() {
  const { value: activeTab, setValue: setActiveTab } = useUrlQueryEnum("tab", SECTOR_TABS, "performance");

  return (
    <div className="portal-page pb-10">
      <PageHeader
        title="Sector Intelligence"
        subtitle="Live NSE sectoral index levels and moves, with relative strength against the Nifty 50."
        trust={{ source: "Live NSE index feed", note: "Not investment advice" }}
      />

      <div
        role="tablist"
        aria-label="Sector workbench views"
        className="flex flex-wrap items-center gap-2 border-b border-border pb-3 text-sm"
      >
        {[
          { id: "performance", label: "Live Performance" },
          { id: "valuation", label: "Valuation Multiples" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`sectors-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`sectors-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id as SectorTab)}
            className={cn(
              "min-h-11 rounded-lg px-3 py-1.5 font-medium transition-colors touch-manipulation",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border/60",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "valuation" ? (
        <div id="sectors-panel-valuation" role="tabpanel" aria-labelledby="sectors-tab-valuation" className="bento-grid-cols-2">
          <MarketValuationCard />
          <EquityRiskPremiumPanel />
        </div>
      ) : null}

      {activeTab === "performance" ? (
        <div
          id="sectors-panel-performance"
          role="tabpanel"
          aria-labelledby="sectors-tab-performance"
          className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm min-h-[320px]"
        >
          <SectorMatrix />
        </div>
      ) : null}
    </div>
  );
}
