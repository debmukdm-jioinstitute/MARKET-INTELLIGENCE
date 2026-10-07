"use client";

import { SecuritySheet } from "@/components/india-markets/security-sheet";
import { MarketsBoard } from "@/components/markets-board/markets-board";
import type { MarketsBoardRow, MarketsBoardTab } from "@/components/markets-board/types";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { useIndiaEquities } from "@/hooks/use-india-equities";
import { INDIA_EQUITIES, findIndiaInstrument, type IndiaInstrument } from "@/lib/feeds/india/instruments";
import { INDIA_BENCHMARK_DEFS } from "@/lib/feeds/india/indices";
import { indexSlugFromLabel } from "@/lib/india-index-meta";
import { pickControlledString } from "@/lib/react/pick-controlled-list-item";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const TABS: MarketsBoardTab[] = [
  { id: "indices", label: "Indices" },
  { id: "equities", label: "Equities" },
];

const TAB_IDS = TABS.map((t) => t.id);

function tabFromUrl(raw: string | null): string {
  if (raw === "equities" || raw === "indices") return raw;
  return "indices";
}

export default function IndiaMarketsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { quotes, loading: eqLoading, error: eqError, reload: reloadEq } = useIndiaEquities();
  const { data: feedData, loading: hubLoading, error: hubError, reload: reloadHub } = useFeedHub(30_000);
  const [selected, setSelected] = useState<IndiaInstrument | null>(null);

  const tab = pickControlledString(TAB_IDS, tabFromUrl(searchParams.get("focus")));

  const setTab = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "indices") params.delete("focus");
      else params.set("focus", id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const live = useMemo(() => new Map(quotes.map((q) => [q.symbol, q])), [quotes]);

  const rows: MarketsBoardRow[] = useMemo(() => {
    const indexRows: MarketsBoardRow[] = (feedData?.indices ?? []).map((idx) => {
      const def = INDIA_BENCHMARK_DEFS.find((d) => d.label === idx.symbol);
      const slug = indexSlugFromLabel(idx.symbol);
      return {
        id: `idx:${idx.symbol}`,
        label: idx.symbol,
        subtitle: idx.name ?? "India",
        region: "India",
        symbol: def?.yahoo ?? idx.symbol,
        yahooSymbol: def?.yahoo,
        tab: "indices",
        price: idx.price,
        change: idx.change,
        changePct: idx.changePct,
        volume: null,
        dayLow: null,
        dayHigh: null,
        week52Low: null,
        week52High: null,
        decimals: 2,
        formattedPrice: idx.price.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }),
        href: slug ? `/markets/india/${slug}` : undefined,
        sourceUrl: def ? `https://finance.yahoo.com/quote/${encodeURIComponent(def.yahoo)}` : undefined,
      };
    });

    const equityRows: MarketsBoardRow[] = INDIA_EQUITIES.map((inst) => {
      const q = live.get(inst.symbol);
      return {
        id: `eq:${inst.symbol}`,
        label: inst.name,
        subtitle: inst.sector,
        region: inst.sector,
        flagRegion: "India",
        symbol: inst.symbol,
        yahooSymbol: `${inst.symbol}.NS`,
        tab: "equities",
        price: q?.price ?? null,
        change: q?.change ?? null,
        changePct: q?.changePct ?? null,
        volume: null,
        dayLow: null,
        dayHigh: null,
        week52Low: null,
        week52High: null,
        decimals: 2,
        formattedPrice:
          q != null
            ? `₹${q.price.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
            : "—",
        sourceUrl: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(inst.symbol)}`,
      };
    });

    return [...indexRows, ...equityRows];
  }, [feedData?.indices, live]);

  const onOpenOverview = useCallback((row: MarketsBoardRow) => {
    if (row.tab !== "equities") return false;
    const inst = findIndiaInstrument(row.symbol);
    if (!inst) return false;
    setSelected(inst);
    return true;
  }, []);

  const loading = (tab === "equities" ? eqLoading : hubLoading) && rows.filter((r) => r.tab === tab).length === 0;
  const error = tab === "equities" ? eqError : hubError;
  const fetchedAt = tab === "equities" ? quotes[0]?.asOf : feedData?.fetchedAt;

  return (
    <>
      <MarketsBoard
        title="Indian markets"
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        rows={rows}
        loading={loading}
        error={error}
        fetchedAt={fetchedAt ?? null}
        onRefresh={() => {
          void reloadEq();
          void reloadHub();
        }}
        searchPlaceholder="Search stocks"
        filterLabel="Filter by sector"
        allFilterLabel="All sectors"
        universeAllLabel="All names"
        noun={tab === "equities" ? "stocks" : "indices"}
        changeSuffix={tab === "equities" ? "" : "points"}
        watchStorageKey="mi-board-watch:india"
        delayedNote="Upstox live in session · last close when shut"
        onOpenOverview={onOpenOverview}
      />
      <SecuritySheet
        instrument={selected}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
