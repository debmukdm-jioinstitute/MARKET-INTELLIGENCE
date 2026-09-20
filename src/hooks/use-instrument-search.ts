"use client";

import { useEffect, useState } from "react";

export type InstrumentSearchResult = {
  market: "IN" | "US";
  symbol: string;
  name: string;
  instrumentKey: string | null;
  sector: string | null;
  currency: "INR" | "USD";
};

/** Debounced search against /api/portfolio/instruments/search. */
export function useInstrumentSearch(market: "IN" | "US", query: string) {
  const [results, setResults] = useState<InstrumentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = window.setTimeout(() => {
      fetch(`/api/portfolio/instruments/search?market=${market}&q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
          if (!cancelled) {
            setResults(json.results ?? []);
            setError(json.error ?? null);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [market, query]);

  return { results, loading, error };
}
