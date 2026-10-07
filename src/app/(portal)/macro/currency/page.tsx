"use client";

import { MarketsBoard } from "@/components/markets-board/markets-board";
import type { MarketsBoardRow, MarketsBoardTab } from "@/components/markets-board/types";
import { useCurrencyQuotes } from "@/hooks/use-currency-quotes";
import { parseCurrencyFocusParam } from "@/lib/macro/currency-universe";
import { pickControlledString } from "@/lib/react/pick-controlled-list-item";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const TABS: MarketsBoardTab[] = [
  { id: "all", label: "All markets" },
  { id: "global", label: "Global & EM" },
  { id: "us", label: "United States" },
  { id: "india", label: "India" },
];

const TAB_IDS = TABS.map((t) => t.id);

export default function CurrencyMacroPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, loading, error, reload } = useCurrencyQuotes();

  const tab = pickControlledString(TAB_IDS, parseCurrencyFocusParam(searchParams.get("focus")) ?? "all");

  const setTab = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "all") params.delete("focus");
      else params.set("focus", id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const rows: MarketsBoardRow[] = useMemo(
    () =>
      (data?.quotes ?? []).map((q) => ({
        id: q.id,
        label: q.label,
        subtitle: q.unit,
        region: q.region,
        symbol: q.symbol,
        yahooSymbol: q.symbol,
        tab: q.focus,
        price: q.price,
        change: q.change,
        changePct: q.changePct,
        volume: q.volume,
        dayLow: q.dayLow,
        dayHigh: q.dayHigh,
        week52Low: q.week52Low,
        week52High: q.week52High,
        decimals: q.decimals,
        formattedPrice: q.formattedPrice,
        sourceUrl: q.source.url,
      })),
    [data?.quotes],
  );

  return (
    <MarketsBoard
      title="Currencies"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      rows={rows}
      loading={loading}
      error={error}
      fetchedAt={data?.fetchedAt}
      onRefresh={reload}
      searchPlaceholder="Search pairs"
      filterLabel="Filter by country"
      allFilterLabel="All countries"
      universeAllLabel="All pairs"
      noun="pairs"
      changeSuffix=""
      watchStorageKey="mi-board-watch:currency"
    />
  );
}
