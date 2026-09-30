"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Flame, Building2, Zap, ArrowRight } from "lucide-react";
import type { SymbolSearchHit } from "@/lib/feeds/symbol-search";
import { COMPANY_RETAIL_SENTIMENT_DATA } from "@/lib/reddit-sentiment/database";

interface RedditStockSearchProps {
  selectedSymbol: string;
  onSelectStock: (symbol: string, companyName?: string) => void;
  className?: string;
}

export function RedditStockSearch({
  selectedSymbol,
  onSelectStock,
  className = "",
}: RedditStockSearchProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SymbolSearchHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search to /api/feeds/search/symbols (powered by Upstox NSE Master)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/feeds/search/symbols?q=${encodeURIComponent(trimmed)}`
        );
        if (res.ok) {
          const data = await res.json();
          const rawHits: SymbolSearchHit[] = data.hits || [];
          // Prioritize Indian equities (Upstox NSE)
          const inHits = rawHits.filter((h) => h.market === "IN");
          const otherHits = rawHits.filter((h) => h.market !== "IN");
          const sorted = [...inHits, ...otherHits].slice(0, 15);
          setHits(sorted);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Upstox symbol search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (hit: SymbolSearchHit) => {
      onSelectStock(hit.symbol, hit.name);
      setQuery("");
      setIsOpen(false);
      setHits([]);
    },
    [onSelectStock]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && hits[activeIndex]) {
      handleSelect(hits[activeIndex]);
      return;
    }
    const trimmed = query.trim().toUpperCase();
    if (trimmed) {
      // Find matching hit or pick first
      const exact = hits.find((h) => h.symbol.toUpperCase() === trimmed);
      if (exact) {
        handleSelect(exact);
      } else if (hits.length > 0) {
        handleSelect(hits[0]);
      } else {
        onSelectStock(trimmed);
        setQuery("");
        setIsOpen(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || hits.length === 0) {
      if (e.key === "Enter") {
        handleSubmit(e);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < hits.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : hits.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && hits[activeIndex]) {
        handleSelect(hits[activeIndex]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (hits.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search NSE symbol or company name…"
            className="w-full min-w-0 rounded-xl border border-border/80 bg-card py-2.5 pl-10 pr-10 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            autoComplete="off"
            aria-label="Search NSE equities"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setHits([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-muted/40 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
            <Zap className="h-3 w-3 text-amber-500" aria-hidden />
            Upstox NSE
          </span>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
          >
            Analyze
          </button>
        </div>
      </form>

      {/* Upstox Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150 sm:right-auto sm:min-w-full">
          <div className="px-3.5 py-2 border-b border-border/40 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Upstox NSE Equities
            </span>
            <span>
              {loading
                ? "Searching Upstox master..."
                : `${hits.length} result${hits.length === 1 ? "" : "s"} found`}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border/20 scrollbar-thin">
            {loading && hits.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Querying Upstox NSE instrument registry...
              </div>
            ) : hits.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching equity found for &ldquo;{query}&rdquo; in Upstox NSE Master.
              </div>
            ) : (
              hits.map((hit, idx) => {
                const isCurated = Boolean(
                  COMPANY_RETAIL_SENTIMENT_DATA[hit.symbol.toUpperCase()]
                );
                const isSelected = hit.symbol.toUpperCase() === selectedSymbol;
                const isActive = idx === activeIndex;

                return (
                  <button
                    key={`${hit.market}-${hit.symbol}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(hit)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : isSelected
                        ? "bg-muted/40 text-foreground"
                        : "hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 font-bold text-xs text-primary">
                        {hit.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground tracking-wide">
                            {hit.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium tabular-nums bg-muted text-muted-foreground border border-border/40">
                            {hit.exchange || "NSE"}
                          </span>
                          {isCurated && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              <Flame className="w-2.5 h-2.5" />
                              High Social Chatter
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {hit.name}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-border/40 bg-muted/10 text-[10px] text-muted-foreground flex items-center justify-between px-3">
            <span>Use ↑ ↓ keys to navigate, Enter to select</span>
            <span>Esc to dismiss</span>
          </div>
        </div>
      )}
    </div>
  );
}
