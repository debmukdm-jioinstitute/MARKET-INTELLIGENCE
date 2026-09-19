"use client";

import type { FullMarketQuote } from "@/lib/feeds/sources/upstox";
import { useCallback, useEffect, useState } from "react";

/** Polls a single India symbol's full market quote — only while `enabled` (e.g. a sheet is open). */
export function useUpstoxQuote(symbol: string | null, enabled: boolean, refreshMs = 6_000) {
  const [data, setData] = useState<FullMarketQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!symbol) return;
    try {
      const res = await fetch(`/api/feeds/upstox/quote?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quote");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (!enabled || !symbol) return;
    setLoading(true);
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [enabled, symbol, reload, refreshMs]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
    }
  }, [enabled]);

  return { data, loading, error, reload };
}
