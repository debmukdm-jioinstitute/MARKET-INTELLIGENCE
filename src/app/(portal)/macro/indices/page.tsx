"use client";

import { MarketsBoard } from "@/components/markets-board/markets-board";
import type { MarketsBoardRow, MarketsBoardTab } from "@/components/markets-board/types";
import { useWorldIndices } from "@/hooks/use-world-indices";
import { INDEX_UNIVERSE, formatIndexPrice } from "@/lib/macro/indices-universe";
import { pickControlledString } from "@/lib/react/pick-controlled-list-item";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const TABS: MarketsBoardTab[] = [
  { id: "americas", label: "Americas" },
  { id: "europe", label: "Europe" },
  { id: "asia_pacific", label: "Asia Pacific" },
  { id: "india", label: "India" },
  { id: "volatility", label: "Volatility" },
];

const TAB_IDS = TABS.map((t) => t.id);
const defById = new Map(INDEX_UNIVERSE.map((d) => [d.id, d]));

function tabFromUrl(raw: string | null): string {
  if (raw === "asia") return "asia_pacific";
  if (raw === "americas" || raw === "europe" || raw === "india" || raw === "volatility" || raw === "asia_pacific") {
    return raw === "asia_pacific" ? "asia_pacific" : raw;
  }
  return "americas";
}

function urlFromTab(id: string): string | null {
  if (id === "americas") return null;
  if (id === "asia_pacific") return "asia";
  return id;
}

export default function WorldIndicesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, loading, error, reload } = useWorldIndices();

  const tab = pickControlledString(TAB_IDS, tabFromUrl(searchParams.get("focus")));

  const setTab = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const next = urlFromTab(id);
      if (!next) params.delete("focus");
      else params.set("focus", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const rows: MarketsBoardRow[] = useMemo(
    () =>
      (data?.indices ?? []).map((q) => {
        const def = defById.get(q.id);
        return {
          id: q.id,
          label: q.label,
          subtitle: q.region,
          region: q.region,
          symbol: q.symbol,
          yahooSymbol: q.symbol,
          tab: q.category,
          price: q.price,
          change: q.change,
          changePct: q.changePct,
          volume: q.volume,
          dayLow: q.dayLow,
          dayHigh: q.dayHigh,
          week52Low: q.week52Low,
          week52High: q.week52High,
          decimals: q.decimals,
          formattedPrice: def ? formatIndexPrice(def, q.price) : (q.price?.toFixed(2) ?? "—"),
          sourceUrl: q.source.url,
        };
      }),
    [data?.indices],
  );

  return (
    <MarketsBoard
      title="Global markets"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      rows={rows}
      loading={loading}
      error={error}
      fetchedAt={data?.fetchedAt}
      onRefresh={reload}
      searchPlaceholder="Search indices"
      filterLabel="Filter by country"
      allFilterLabel="All countries"
      universeAllLabel="All indices"
      noun="indices"
      changeSuffix="points"
      watchStorageKey="mi-board-watch:indices"
    />
  );
}
