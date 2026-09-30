"use client";

import { useEffect, useRef, useState } from "react";
import type { SymbolSearchHit } from "@/lib/feeds/symbol-search";
import { TRACKED_SUBREDDITS } from "@/lib/reddit-sentiment/tracked-subreddits";
import { LiveSentimentPanel } from "./live-sentiment-panel";
import { Flame, Search, ExternalLink, Users, BarChart2 } from "lucide-react";

interface Props {
  initialSymbol?: string;
}

/** A few well-known large caps as one-click suggestions — plain symbols, no numbers attached, so nothing here is a claim about their actual Reddit activity until you click and it fetches for real. */
const SUGGESTED_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN",
  "TATAMOTORS", "ITC", "BHARTIARTL", "MARUTI", "SUZLON", "ZOMATO",
];

function TickerAutocomplete({ onSelect }: { onSelect: (symbol: string) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SymbolSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(() => {
      fetch(`/api/search/unified?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((json: { symbols?: SymbolSearchHit[] }) => {
          setHits(json.symbols ?? []);
          setOpen(true);
        })
        .catch(() => setHits([]));
    }, 200);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder="Search any NSE/US company — Reliance, TATAMOTORS, Suzlon..."
        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-muted/40 border border-border/60 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
        aria-label="Search company to fetch real Reddit sentiment"
      />
      {open && hits.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          {hits.map((h) => (
            <li key={`${h.market}-${h.symbol}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onSelect(h.symbol);
                  setQuery("");
                  setHits([]);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
              >
                <span>
                  <span className="font-semibold text-foreground">{h.symbol}</span>
                  <span className="ml-2 text-muted-foreground">{h.name}</span>
                </span>
                <span className="shrink-0 text-[10px] uppercase text-primary">{h.market === "IN" ? "India" : "US"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function RetailSentimentHub({ initialSymbol }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol?.toUpperCase() || "RELIANCE");
  const [activeTab, setActiveTab] = useState<"sentiment" | "communities">("sentiment");

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">Retail Alternative Sentiment Engine</h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">Live Reddit search</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fetches real posts from India-focused financial subreddits at request time — no precomputed dataset, no data for
                a company until you actually search it.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("sentiment")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === "sentiment"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Company Retail Sentiment</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-inherit tabular-nums">{selectedSymbol}</span>
          </button>
          <button
            onClick={() => setActiveTab("communities")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === "communities"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Monitored Communities ({TRACKED_SUBREDDITS.length})</span>
          </button>
        </div>
      </div>

      {activeTab === "sentiment" && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
          <TickerAutocomplete onSelect={setSelectedSymbol} />
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">Try:</span>
            {SUGGESTED_SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSymbol(s)}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  s === selectedSymbol
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "sentiment" && (
        <div>
          <LiveSentimentPanel symbol={selectedSymbol} />
        </div>
      )}

      {activeTab === "communities" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm">
            <h4 className="text-sm font-semibold text-foreground">Monitored Financial Subreddits</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Searched live for each company you look up. Member counts are approximate (Reddit's unauthenticated API doesn't
              expose them) — everything else here is real and verifiable at the link.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRACKED_SUBREDDITS.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-all shadow-sm space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-primary">{sub.id}</span>
                    <span className="text-xs text-muted-foreground tabular-nums bg-muted/40 px-2 py-0.5 rounded">
                      ~{sub.memberCount} members
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-foreground mt-1">
                    {sub.name} ({sub.geoFocus} Focus)
                  </h5>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{sub.focusArea}</p>
                </div>
                <div className="pt-3 border-t border-border/40 flex justify-end">
                  <a
                    href={sub.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <span>Visit Community</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
