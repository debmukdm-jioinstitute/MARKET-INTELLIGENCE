"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Search,
  Star,
  X,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { CountryFlag } from "./country-flag";
import type { SortColumn, SortDirection, TableFilter, WorldIndexQuote } from "./types";
import { formatPrice, formatSignedPct, sortIndices } from "./utils";
import { cn } from "@/lib/utils";

interface TableCardProps {
  items: WorldIndexQuote[];
  selectedId: string | null;
  onSelectIndex: (item: WorldIndexQuote) => void;
  compareSet: Set<string>;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
  isWatchlisted: (id: string, sym?: string) => boolean;
  onToggleWatchlist: (id: string, sym?: string, label?: string) => void;
  className?: string;
}

export function TableCard({
  items,
  selectedId,
  onSelectIndex,
  compareSet,
  onToggleCompare,
  onOpenCompare,
  isWatchlisted,
  onToggleWatchlist,
  className,
}: TableCardProps) {
  const searchInputId = useId();
  const countrySelectId = useId();

  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState<TableFilter>("all");
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);

  // Derive unique countries in current dataset
  const availableCountries = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.region))).filter(Boolean);
    return list.sort();
  }, [items]);

  // Filter items by search, country, and watchlist toggle
  const filteredItems = useMemo(() => {
    let result = items;

    if (segmentFilter === "watchlist") {
      result = result.filter((i) => isWatchlisted(i.id, i.symbol));
    }

    if (countryFilter !== "all") {
      result = result.filter((i) => i.region.toLowerCase() === countryFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.symbol.toLowerCase().includes(q) ||
          i.region.toLowerCase().includes(q),
      );
    }

    return result;
  }, [items, segmentFilter, countryFilter, searchQuery, isWatchlisted]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortCol || !sortDir) return filteredItems;
    return sortIndices(filteredItems, sortCol, sortDir);
  }, [filteredItems, sortCol, sortDir]);

  // Cycle sorting: unsorted -> asc -> desc -> unsorted
  const handleSort = (col: SortColumn) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortCol(null);
      setSortDir(null);
    }
  };

  // Compare selection handler with limit enforcement (2-4 indices)
  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!compareSet.has(id) && compareSet.size >= 4) {
      setCompareNotice("Select between 2 and 4 indices to compare.");
      setTimeout(() => setCompareNotice(null), 3000);
      return;
    }
    setCompareNotice(null);
    onToggleCompare(id);
  };

  // Compute footer counts over currently visible rows
  const footerCounts = useMemo(() => {
    let advancing = 0;
    let declining = 0;
    let unavailable = 0;

    for (const item of sortedItems) {
      const val = item.change ?? item.changePct;
      if (val == null || !Number.isFinite(val)) unavailable++;
      else if (val > 0) advancing++;
      else if (val < 0) declining++;
    }

    return { total: sortedItems.length, advancing, declining, unavailable };
  }, [sortedItems]);

  const canCompare = compareSet.size >= 2 && compareSet.size <= 4;

  return (
    <section
      aria-label="Regional indices data table"
      className={cn(
        "market-card flex flex-col justify-between rounded-[22px] border-[1.5px] border-[#151515] bg-[#FCFCFA] p-4 text-[#151515] sm:p-5",
        className,
      )}
    >
      <div>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#151515]/10 pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search input */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#62656B]"
                aria-hidden="true"
              />
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indices"
                aria-label="Search indices"
                className="h-9 w-full rounded-full border border-[#151515]/30 bg-white pl-9 pr-8 text-sm text-[#151515] placeholder:text-[#62656B] focus:border-[#151515] focus:outline-none focus:ring-1 focus:ring-[#151515]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#62656B] hover:text-[#151515]"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {/* Country filter dropdown */}
            <label htmlFor={countrySelectId} className="sr-only">
              Filter by country
            </label>
            <select
              id={countrySelectId}
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="h-9 rounded-full border border-[#151515]/30 bg-white px-3 text-sm text-[#151515] focus:border-[#151515] focus:outline-none focus:ring-1 focus:ring-[#151515]"
            >
              <option value="all">All countries</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* All indices / Watchlist segmented toggle */}
            <div
              role="radiogroup"
              aria-label="Filter universe"
              className="inline-flex rounded-full border border-[#151515]/30 bg-white p-0.5"
            >
              <button
                type="button"
                role="radio"
                aria-checked={segmentFilter === "all"}
                onClick={() => setSegmentFilter("all")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-colors",
                  segmentFilter === "all"
                    ? "bg-[#151515] text-white"
                    : "text-[#151515] hover:bg-black/5",
                )}
              >
                All indices
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={segmentFilter === "watchlist"}
                onClick={() => setSegmentFilter("watchlist")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-colors",
                  segmentFilter === "watchlist"
                    ? "bg-[#151515] text-white"
                    : "text-[#151515] hover:bg-black/5",
                )}
              >
                Watchlist
              </button>
            </div>

            {/* Compare action button */}
            <div className="relative">
              <button
                type="button"
                onClick={onOpenCompare}
                disabled={!canCompare}
                aria-label={`Compare ${compareSet.size} selected indices`}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-xs font-bold transition-all",
                  canCompare
                    ? "border-[#151515] bg-[#151515] text-white hover:bg-black/90 active:scale-95"
                    : "cursor-not-allowed border-[#151515]/20 bg-black/5 text-[#62656B]/60",
                )}
              >
                Compare ({compareSet.size})
              </button>
              {compareNotice ? (
                <div
                  role="status"
                  className="absolute right-0 top-11 z-30 whitespace-nowrap rounded-lg border border-[#151515] bg-white px-3 py-1.5 text-xs font-medium text-[#151515] shadow-md"
                >
                  {compareNotice}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Table container with contained scroll */}
        <div className="max-h-[580px] overflow-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-[#151515]/15 bg-[#FCFCFA] text-[15px] font-semibold text-[#62656B]">
                <th scope="col" className="w-10 px-2.5 py-3 text-center">
                  <span className="sr-only">Compare selection</span>
                </th>
                <th scope="col" className="w-9 px-1 py-3 text-center">
                  <span className="sr-only">Inspect details</span>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3"
                  aria-sort={sortCol === "index" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => handleSort("index")}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#151515] hover:text-black"
                  >
                    <span>Index</span>
                    {sortCol === "index" ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3.5 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 text-[#62656B]" />
                    )}
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right"
                  aria-sort={sortCol === "price" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => handleSort("price")}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#151515] hover:text-black"
                  >
                    <span>Last price</span>
                    {sortCol === "price" ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3.5 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 text-[#62656B]" />
                    )}
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right"
                  aria-sort={sortCol === "changePct" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => handleSort("changePct")}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#151515] hover:text-black"
                  >
                    <span>Change %</span>
                    {sortCol === "changePct" ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3.5 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 text-[#62656B]" />
                    )}
                  </button>
                </th>
                <th scope="col" className="w-12 px-3 py-3 text-center">
                  <span className="sr-only">Watch</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[#62656B]">
                    No indices match your current filters.
                  </td>
                </tr>
              ) : (
                sortedItems.map((row) => {
                  const isSelected = row.id === selectedId;
                  const isChecked = compareSet.has(row.id);
                  const isStarred = isWatchlisted(row.id, row.symbol);
                  const isNegative = row.changePct != null && row.changePct < 0;
                  const isPositive = row.changePct != null && row.changePct > 0;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => onSelectIndex(row)}
                      className={cn(
                        "group cursor-pointer border-b border-[#151515]/10 transition-colors",
                        isSelected
                          ? "border-l-[3px] border-l-[#151515] bg-[#FCEDEA]"
                          : "hover:bg-[#F6F5F1]/80",
                      )}
                    >
                      {/* Comparison Checkbox */}
                      <td
                        className="px-2.5 py-3 text-center"
                        onClick={(e) => handleCheckboxClick(e, row.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          aria-label={`Select ${row.label} for comparison`}
                          className="size-4 cursor-pointer rounded border-[#151515] accent-[#151515] focus:ring-1 focus:ring-[#151515]"
                        />
                      </td>

                      {/* Disclosure / Detail arrow */}
                      <td className="px-1 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-full transition-transform",
                            isSelected ? "text-[#151515]" : "text-[#62656B]/50 group-hover:text-[#151515]",
                          )}
                          title="Show details"
                        >
                          <ChevronRight className="size-4 stroke-[2.5]" />
                        </span>
                      </td>

                      {/* Index Flag + Name + Country */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <CountryFlag country={row.region} isDecorative />
                          <div className="flex flex-col">
                            <span className="text-[17px] font-bold text-[#151515]">
                              {row.label}
                            </span>
                            <span className="text-[14px] text-[#62656B]">{row.region}</span>
                          </div>
                        </div>
                      </td>

                      {/* Last Price */}
                      <td className="px-3 py-3 text-right text-[17px] font-bold tabular-nums text-[#151515]">
                        {formatPrice(row.price, row.decimals)}
                      </td>

                      {/* Change % */}
                      <td
                        className={cn(
                          "px-3 py-3 text-right text-[16px] font-bold tabular-nums",
                          isNegative && "text-[#A52F38]",
                          isPositive && "text-[#26713D]",
                          !isNegative && !isPositive && "text-[#151515]",
                        )}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {isNegative ? (
                            <ArrowDown className="size-3.5 stroke-[3]" aria-hidden="true" />
                          ) : isPositive ? (
                            <ArrowUp className="size-3.5 stroke-[3]" aria-hidden="true" />
                          ) : null}
                          <span>{formatSignedPct(row.changePct)}</span>
                        </span>
                      </td>

                      {/* Watchlist Star Toggle */}
                      <td
                        className="px-3 py-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(row.id, row.symbol, row.label);
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`${isStarred ? "Remove from" : "Add to"} watchlist: ${row.label}`}
                          aria-pressed={isStarred}
                          className="inline-flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={cn(
                              "size-4 stroke-[2]",
                              isStarred
                                ? "fill-[#151515] text-[#151515]"
                                : "text-[#62656B] hover:text-[#151515]",
                            )}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer with dynamically computed counts */}
      <footer className="mt-4 border-t border-[#151515]/10 pt-3 text-xs text-[#62656B]">
        <span>
          Showing {footerCounts.total} indices · {footerCounts.declining} declining ·{" "}
          {footerCounts.advancing} advancing
          {footerCounts.unavailable > 0 ? ` · ${footerCounts.unavailable} unavailable` : ""}
        </span>
      </footer>
    </section>
  );
}
