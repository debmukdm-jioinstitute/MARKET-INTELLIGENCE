"use client";

import type { LiveQuote } from "@/lib/feeds/types";
import { useCallback, useEffect, useState } from "react";

/** LTP for the curated India-equity instrument list — src/lib/feeds/india/instruments.ts. */
export function useIndiaEquities(refreshMs = 10_000) {
  const [quotes, setQuotes] = useState<LiveQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/feeds/upstox/india-equities", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setQuotes(json.quotes ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load India equities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  return { quotes, loading, error, reload };
}
