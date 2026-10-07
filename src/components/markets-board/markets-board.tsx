"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { RegionFlag } from "@/components/markets-board/flag";
import {
  formatBoardPrice,
  formatChangePct,
  formatSignedNumber,
  formatVolumeLong,
  formatVolumeShort,
} from "@/components/markets-board/format";
import { RangeMeter } from "@/components/markets-board/range-meter";
import type { MarketsBoardProps, MarketsBoardRow } from "@/components/markets-board/types";
import { useBoardWatchlist } from "@/components/markets-board/use-board-watchlist";
import { pickControlledString } from "@/lib/react/pick-controlled-list-item";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  BarChart2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useMemo, useState } from "react";
import "./markets-board.css";

type SortKey = "label" | "price" | "changePct";
type UniverseFilter = "all" | "watch";

function rowHasOverviewAction(
  row: MarketsBoardRow,
  onOpenOverview?: MarketsBoardProps["onOpenOverview"],
): boolean {
  if (row.href?.startsWith("/")) return true;
  if (onOpenOverview && row.tab === "equities") return true;
  if (row.sourceUrl) return true;
  return false;
}

export function MarketsBoard({
  title,
  tabs,
  activeTab,
  onTabChange,
  rows,
  loading,
  error,
  fetchedAt,
  onRefresh,
  searchPlaceholder = "Search",
  filterLabel = "Filter by country",
  allFilterLabel = "All countries",
  universeAllLabel = "All indices",
  watchlistLabel = "Watchlist",
  noun = "indices",
  changeSuffix = "points",
  watchStorageKey,
  delayedNote = "Delayed quotes · Closed markets show last close",
  onOpenOverview,
}: MarketsBoardProps) {
  const router = useRouter();
  const searchId = useId();
  const filterId = useId();
  const { has: watched, toggle: toggleWatch } = useBoardWatchlist(watchStorageKey);

  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);
  const tab = pickControlledString(tabIds, activeTab);

  const [query, setQuery] = useState("");
  const [regionRaw, setRegionRaw] = useState("all");
  const [universe, setUniverse] = useState<UniverseFilter>("all");
  const [selectedRaw, setSelectedRaw] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedRaw, setExpandedRaw] = useState<string | null>(null);
  const [hist, setHist] = useState<Record<string, { date: string; v: number }[]>>({});

  const tabRows = useMemo(
    () => (tabIds.includes("all") && tab === "all" ? rows : rows.filter((r) => r.tab === tab)),
    [rows, tab, tabIds],
  );

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const r of tabRows) if (r.region) set.add(r.region);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tabRows]);

  const regionOptions = useMemo(() => ["all", ...regions], [regions]);
  const region = pickControlledString(regionOptions, regionRaw);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tabRows;
    if (region !== "all") list = list.filter((r) => r.region === region);
    if (universe === "watch") list = list.filter((r) => watched(r.id));
    if (q) {
      list = list.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q) ||
          r.region.toLowerCase().includes(q),
      );
    }
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        if (sortKey === "label") return a.label.localeCompare(b.label) * dir;
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir;
      });
    }
    return list;
  }, [tabRows, region, universe, query, sortKey, sortDir, watched]);

  const visibleIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const fallbackId = filtered.find((r) => r.price != null)?.id ?? visibleIds[0] ?? "";
  const selectedId = pickControlledString(visibleIds, selectedRaw || fallbackId);
  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;
  const expandedId = expandedRaw && visibleIds.includes(expandedRaw) ? expandedRaw : null;

  useEffect(() => {
    if (!expandedId) return;
    const row = filtered.find((r) => r.id === expandedId);
    const sym = row?.yahooSymbol ?? row?.symbol;
    if (!row || !sym || hist[expandedId]?.length) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/feeds/yahoo/history?symbol=${encodeURIComponent(sym)}&range=6mo`);
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
  }, [expandedId, filtered, hist]);

  const down = (selected?.changePct ?? 0) < 0;
  const up = (selected?.changePct ?? 0) > 0;

  const updatedLabel = fetchedAt
    ? `Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour12: false })}`
    : loading
      ? "Updating…"
      : "Updated —";

  const cycleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") setSortDir("desc");
    else {
      setSortKey(null);
      setSortDir("asc");
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openOverview = useCallback(
    (row: MarketsBoardRow) => {
      if (onOpenOverview?.(row)) return;
      if (row.href?.startsWith("/")) {
        router.push(row.href);
        return;
      }
      if (row.sourceUrl) window.open(row.sourceUrl, "_blank", "noopener,noreferrer");
    },
    [onOpenOverview, router],
  );

  const compareRows = compareIds
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is MarketsBoardRow => r != null);

  const showOverviewHint =
    selected != null && rowHasOverviewAction(selected, onOpenOverview);

  return (
    <div className="-mx-3 -mt-3 mb-0 flex min-h-[calc(100dvh-8.5rem)] min-w-0 flex-col bg-[#F6F5F1] p-2 sm:-mx-4 sm:-mt-4 sm:p-2 md:-mx-5 md:-mt-5 md:p-2 min-[1100px]:h-[calc(100dvh-10.75rem)] min-[1100px]:max-h-[calc(100dvh-10.75rem)] min-[1100px]:overflow-hidden">
      <div className="global-markets flex min-h-0 flex-1 flex-col gap-2 min-[1100px]:h-full min-[1100px]:max-h-full">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center">
            <Link
              href="/macro"
              className="inline-flex min-w-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Image
                src="/logo.png"
                alt="Market intelligence"
                width={480}
                height={83}
                className="h-7 w-auto shrink-0 object-contain object-left mix-blend-multiply"
                priority
              />
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex flex-col text-right text-[11px] text-[#62656B]">
              <span className="font-semibold text-[#151515]">{updatedLabel}</span>
              <span className="text-[10px]">{delayedNote}</span>
            </div>
            {onRefresh ? (
              <button
                type="button"
                aria-label="Refresh quotes"
                onClick={() => onRefresh()}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] px-3 py-1.5 text-xs font-bold text-[#151515] shadow-xs transition-all hover:bg-[#F6F5F1] active:scale-95"
              >
                <RefreshCw className="size-3.5 stroke-[2.25]" aria-hidden />
                <span>Refresh</span>
              </button>
            ) : null}
          </div>
        </header>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#151515] sm:text-3xl lg:text-[32px]">
            {title}
          </h1>
          <nav aria-label="Market regions" className="flex items-center gap-1.5">
            <div role="tablist" className="inline-flex flex-wrap rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] p-0.5 shadow-xs">
              {tabs.map((t) => {
                const on = t.id === tab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => onTabChange(t.id)}
                    className={cn(
                      "rounded-full px-3.5 py-1 text-xs font-bold transition-all",
                      on ? "bg-[#151515] text-white" : "text-[#151515] hover:bg-black/5",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {error ? <p className="mb-2 text-sm text-[#A52F38]">{error}</p> : null}

        <div className="main-bento min-h-[240px] flex-1 min-[1100px]:min-h-0">
          <article
            aria-labelledby="hero-index-name"
            className={cn(
              "market-card flex h-full min-h-0 flex-col justify-between rounded-[22px] border-[1.5px] border-[#151515] p-4 text-[#151515] shadow-[3px_3px_0px_#151515] transition-colors duration-200 sm:p-5",
              down && "hero-down",
              up && "hero-up",
            )}
          >
            {selected ? (
              <>
                <div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                    <RegionFlag region={selected.flagRegion ?? selected.region} />
                    <h2
                      id="hero-index-name"
                      className="text-[20px] font-bold tracking-tight text-[#151515] sm:text-[22px] lg:text-[24px]"
                    >
                      {selected.label}
                    </h2>
                    {showOverviewHint ? (
                      <button
                        type="button"
                        onClick={() => openOverview(selected)}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-[14px] border-[1.5px] border-[#151515] bg-white px-2.5 py-1.5 text-left text-[11px] font-bold leading-snug text-[#151515] shadow-[2px_2px_0px_#151515] transition-all hover:bg-[#F6F5F1] active:scale-[0.98] sm:text-xs"
                      >
                        <span>Open overview to see the details</span>
                        <ArrowRight className="size-3.5 shrink-0 stroke-[2.5]" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  <div className="my-2.5 flex flex-col text-[44px] font-bold leading-[0.96] tracking-tight text-[#151515] sm:my-3.5 sm:text-[52px] lg:text-[58px]">
                    {selected.changePct == null && selected.price == null ? (
                      <span>Waiting.</span>
                    ) : down ? (
                      <>
                        <span>Lower</span>
                        <span>today.</span>
                      </>
                    ) : up ? (
                      <>
                        <span>Higher</span>
                        <span>today.</span>
                      </>
                    ) : (
                      <>
                        <span>Unchanged</span>
                        <span>today.</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="break-words text-[36px] font-bold tabular-nums tracking-tight text-[#151515] sm:text-[42px] lg:text-[48px]">
                      {selected.formattedPrice}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div
                        className="inline-flex items-center gap-1 rounded-full border border-black/5 bg-black/5 px-2.5 py-0.5 text-[15px] font-bold tabular-nums text-[#151515] sm:text-[17px]"
                        aria-label={`Daily change percent: ${formatChangePct(selected.changePct)}`}
                      >
                        {down ? (
                          <ArrowDownRight className="size-4 shrink-0 stroke-[2.75]" aria-hidden />
                        ) : up ? (
                          <ArrowUpRight className="size-4 shrink-0 stroke-[2.75]" aria-hidden />
                        ) : null}
                        <span>{formatChangePct(selected.changePct)}</span>
                      </div>
                      {selected.change != null ? (
                        <div
                          className="text-[16px] font-bold tabular-nums text-[#151515] sm:text-[18px]"
                          aria-label={`Absolute change: ${formatSignedNumber(selected.change, selected.decimals)} ${changeSuffix}`}
                        >
                          {formatSignedNumber(selected.change, selected.decimals)}
                          {changeSuffix ? ` ${changeSuffix}` : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-[#151515]/15 pt-2.5">
                  <div className="text-[13px] font-semibold text-[#151515] sm:text-[14px]">
                    {selected.region} · {selected.symbol}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#151515]/75">Compared with previous close.</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#62656B]">{loading ? "Loading quotes…" : "No quotes in this view."}</p>
            )}
          </article>

          <section
            aria-label={`Regional ${noun} data table`}
            className="market-card flex h-full min-h-0 flex-col justify-between rounded-[22px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-3 text-[#151515] sm:p-3.5"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#151515]/10 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[170px] sm:min-w-[200px]">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#62656B]"
                      aria-hidden
                    />
                    <input
                      id={searchId}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="h-8 w-full rounded-full border border-[#151515]/30 bg-white pl-8 pr-7 text-xs text-[#151515] placeholder:text-[#62656B] focus:border-[#151515] focus:outline-none focus:ring-1 focus:ring-[#151515]"
                      type="text"
                    />
                  </div>
                  <label htmlFor={filterId} className="sr-only">
                    {filterLabel}
                  </label>
                  <select
                    id={filterId}
                    value={region}
                    onChange={(e) => setRegionRaw(e.target.value)}
                    className="h-8 rounded-full border border-[#151515]/30 bg-white px-2.5 text-xs text-[#151515] focus:border-[#151515] focus:outline-none focus:ring-1 focus:ring-[#151515]"
                  >
                    <option value="all">{allFilterLabel}</option>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div role="radiogroup" aria-label="Filter universe" className="inline-flex rounded-full border border-[#151515]/30 bg-white p-0.5">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={universe === "all"}
                      onClick={() => setUniverse("all")}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                        universe === "all" ? "bg-[#151515] text-white" : "text-[#151515] hover:bg-black/5",
                      )}
                    >
                      {universeAllLabel}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={universe === "watch"}
                      onClick={() => setUniverse("watch")}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                        universe === "watch" ? "bg-[#151515] text-white" : "text-[#151515] hover:bg-black/5",
                      )}
                    >
                      {watchlistLabel}
                    </button>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={compareIds.length < 2}
                      aria-label={`Compare ${compareIds.length} selected ${noun}`}
                      onClick={() => setCompareOpen((v) => !v)}
                      className={cn(
                        "h-8 rounded-full border px-3 text-[11px] font-bold transition-all",
                        compareIds.length < 2
                          ? "cursor-not-allowed border-[#151515]/20 bg-black/5 text-[#62656B]/60"
                          : "border-[#151515] bg-[#FCFCFA] text-[#151515] hover:bg-[#F6F5F1]",
                      )}
                    >
                      Compare ({compareIds.length})
                    </button>
                    {compareOpen && compareRows.length >= 2 ? (
                      <div className="absolute right-0 z-20 mt-1 w-[min(360px,80vw)] rounded-[16px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-3 shadow-[3px_3px_0px_#151515]">
                        <p className="mb-2 text-[11px] font-bold text-[#151515]">Compare</p>
                        <ul className="space-y-1.5">
                          {compareRows.map((r) => (
                            <li key={r.id} className="flex items-baseline justify-between gap-2 text-xs">
                              <span className="font-semibold text-[#151515]">{r.label}</span>
                              <span className="tabular-nums">
                                {r.formattedPrice}{" "}
                                <span className={r.changePct != null && r.changePct < 0 ? "text-[#A52F38]" : "text-[#26713D]"}>
                                  {formatChangePct(r.changePct)}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[580px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-[#151515]/15 bg-[#FCFCFA] text-[13px] font-semibold text-[#62656B]">
                      <th scope="col" className="w-9 px-2 py-2 text-center">
                        <span className="sr-only">Compare selection</span>
                      </th>
                      <th scope="col" className="w-8 px-1 py-2 text-center">
                        <span className="sr-only">Inspect details</span>
                      </th>
                      <th scope="col" className="px-2.5 py-2" aria-sort="none">
                        <SortBtn label={noun === "pairs" ? "Pair" : noun === "commodities" ? "Contract" : "Index"} onClick={() => cycleSort("label")} />
                      </th>
                      <th scope="col" className="px-2.5 py-2 text-right" aria-sort="none">
                        <SortBtn label="Last price" onClick={() => cycleSort("price")} right />
                      </th>
                      <th scope="col" className="px-2.5 py-2 text-right" aria-sort="none">
                        <SortBtn label="Change %" onClick={() => cycleSort("changePct")} right />
                      </th>
                      <th scope="col" className="w-10 px-2.5 py-2 text-center">
                        <span className="sr-only">Watch</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const on = row.id === selected?.id;
                      const chgDown = (row.changePct ?? 0) < 0;
                      const chgUp = (row.changePct ?? 0) > 0;
                      const open = expandedId === row.id;
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={cn(
                              "group cursor-pointer border-b border-[#151515]/10 transition-colors",
                              on && "border-l-[3px] border-l-[#151515] bg-[#FCEDEA]",
                            )}
                            onClick={() => setSelectedRaw(row.id)}
                          >
                            <td className="px-2 py-2 text-center">
                              <input
                                aria-label={`Select ${row.label} for comparison`}
                                className="size-3.5 cursor-pointer rounded border-[#151515] accent-[#151515] focus:ring-1 focus:ring-[#151515]"
                                type="checkbox"
                                checked={compareIds.includes(row.id)}
                                onChange={() => toggleCompare(row.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-1 py-2 text-center">
                              <button
                                type="button"
                                className="inline-flex size-5 items-center justify-center rounded-full text-[#151515] transition-transform"
                                title={open ? "Hide details" : "Show details"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRaw(open ? null : row.id);
                                }}
                              >
                                {open ? (
                                  <ChevronDown className="size-3.5 stroke-[2.5]" aria-hidden />
                                ) : (
                                  <ChevronRight className="size-3.5 stroke-[2.5]" aria-hidden />
                                )}
                              </button>
                            </td>
                            <td className="px-2.5 py-2">
                              <div className="flex items-center gap-2.5">
                                <RegionFlag region={row.flagRegion ?? row.region} />
                                <div className="flex flex-col">
                                  <span className="text-[15px] font-bold text-[#151515]">{row.label}</span>
                                  <span className="text-[11px] text-[#62656B]">{row.subtitle || row.region}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2.5 py-2 text-right text-[14px] font-bold tabular-nums text-[#151515]">
                              {row.formattedPrice}
                            </td>
                            <td
                              className={cn(
                                "px-2.5 py-2 text-right text-[14px] font-bold tabular-nums",
                                chgDown ? "text-[#A52F38]" : chgUp ? "text-[#26713D]" : "text-[#62656B]",
                              )}
                            >
                              <span className="inline-flex items-center justify-end gap-0.5">
                                {chgDown ? (
                                  <ArrowDown className="size-3 stroke-[3]" aria-hidden />
                                ) : chgUp ? (
                                  <ArrowUp className="size-3 stroke-[3]" aria-hidden />
                                ) : null}
                                <span>{formatChangePct(row.changePct)}</span>
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-center">
                              <button
                                type="button"
                                aria-label={watched(row.id) ? `Remove from watchlist: ${row.label}` : `Add to watchlist: ${row.label}`}
                                aria-pressed={watched(row.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWatch(row.id);
                                }}
                                className="inline-flex items-center justify-center"
                              >
                                <Star
                                  className={cn(
                                    "size-3.5 stroke-[2.25] text-[#151515]",
                                    watched(row.id) && "fill-[#151515]",
                                  )}
                                  aria-hidden
                                />
                              </button>
                            </td>
                          </tr>
                          {open ? (
                            <tr className="border-b border-[#151515]/10 bg-[#FCFCFA]">
                              <td colSpan={6} className="px-3 py-3">
                                <div className="h-[160px]">
                                  {hist[row.id]?.length ? (
                                    <Lines
                                      data={hist[row.id]}
                                      keys={[{ key: "v", color: "#151515", name: row.label }]}
                                    />
                                  ) : (
                                    <p className="text-[11px] text-[#62656B]">Loading 6-month trend…</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                    {!loading && filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-[#62656B]">
                          {universe === "watch" ? "No items on this watchlist." : "No matches."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <p className="pt-2 text-[11px] text-[#62656B]">
                Showing {filtered.length} {noun} · {compareIds.length} selected · {filtered.filter((r) => watched(r.id)).length} watched
              </p>
            </div>
          </section>
        </div>

        <div className="mt-0 shrink-0 space-y-2">
          <div className="metrics-bento">
            <section
              aria-labelledby="day-range-heading"
              className="market-card flex min-h-[120px] max-h-[145px] flex-col justify-between rounded-[20px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-3.5 text-[#151515] sm:p-4 lg:h-[130px]"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <h3 id="day-range-heading" className="text-[16px] font-bold tracking-tight text-[#151515] sm:text-[17px]">
                    {selected ? `${selected.label} day range` : "Day range"}
                  </h3>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[16px] font-bold tabular-nums text-[#151515] sm:text-[18px]">
                  <div>
                    <span className="mr-1 text-[11px] font-medium text-[#62656B]">Low</span>
                    <span>{formatBoardPrice(selected?.dayLow ?? null, selected?.decimals ?? 2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="mr-1 text-[11px] font-medium text-[#62656B]">High</span>
                    <span>{formatBoardPrice(selected?.dayHigh ?? null, selected?.decimals ?? 2)}</span>
                  </div>
                </div>
                <div className="my-1.5">
                  <RangeMeter
                    label={`${selected?.label ?? "Instrument"} today range position`}
                    price={selected?.price ?? null}
                    low={selected?.dayLow ?? null}
                    high={selected?.dayHigh ?? null}
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#62656B]">Current value within today’s range.</p>
            </section>

            <section
              aria-labelledby="volume-heading"
              className="market-card flex min-h-[120px] max-h-[145px] flex-col justify-between rounded-[20px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-3.5 text-[#151515] sm:p-4 lg:h-[130px]"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <h3 id="volume-heading" className="text-[16px] font-bold tracking-tight text-[#151515] sm:text-[17px]">
                    {selected ? `${selected.label} volume` : "Volume"}
                  </h3>
                  <BarChart2 className="size-4 text-[#62656B]" aria-hidden />
                </div>
                <div className="mt-1">
                  <div className="text-[26px] font-bold tabular-nums tracking-tight text-[#151515] sm:text-[32px]">
                    {formatVolumeShort(selected?.volume ?? null)}
                  </div>
                  <div className="text-xs font-medium text-[#62656B]">{formatVolumeLong(selected?.volume ?? null)}</div>
                </div>
              </div>
              <p className="text-[11px] text-[#62656B]">Reported aggregate trading volume.</p>
            </section>

            <section
              aria-labelledby="week52-range-heading"
              className="market-card flex min-h-[120px] max-h-[145px] flex-col justify-between rounded-[20px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-3.5 text-[#151515] sm:p-4 lg:h-[130px]"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <h3 id="week52-range-heading" className="text-[16px] font-bold tracking-tight text-[#151515] sm:text-[17px]">
                    {selected ? `${selected.label} · 52-week range` : "52-week range"}
                  </h3>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[16px] font-bold tabular-nums text-[#151515] sm:text-[18px]">
                  <div>
                    <span className="mr-1 text-[11px] font-medium text-[#62656B]">52W Low</span>
                    <span>{formatBoardPrice(selected?.week52Low ?? null, selected?.decimals ?? 2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="mr-1 text-[11px] font-medium text-[#62656B]">52W High</span>
                    <span>{formatBoardPrice(selected?.week52High ?? null, selected?.decimals ?? 2)}</span>
                  </div>
                </div>
                <div className="my-1.5">
                  <RangeMeter
                    label={`${selected?.label ?? "Instrument"} 52-week range position`}
                    price={selected?.price ?? null}
                    low={selected?.week52Low ?? null}
                    high={selected?.week52High ?? null}
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#62656B]">Current value within the yearly range.</p>
            </section>
          </div>

          {selected ? (
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                aria-pressed={watched(selected.id)}
                onClick={() => toggleWatch(selected.id)}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] px-4 py-1.5 text-xs font-bold text-[#151515] shadow-xs transition-all hover:bg-[#F6F5F1] active:scale-95"
              >
                <Star
                  className={cn("size-3.5 stroke-[2.25] text-[#151515]", watched(selected.id) && "fill-[#151515]")}
                  aria-hidden
                />
                <span>{watched(selected.id) ? "Remove from watchlist" : "Add to watchlist"}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortBtn({ label, onClick, right }: { label: string; onClick: () => void; right?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-[#151515] hover:text-black",
        right && "ml-auto",
      )}
      onClick={onClick}
    >
      <span>{label}</span>
      <ArrowUpDown className="size-3 text-[#62656B]" aria-hidden />
    </button>
  );
}
