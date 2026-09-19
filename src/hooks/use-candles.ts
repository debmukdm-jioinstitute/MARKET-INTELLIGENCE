"use client";

import type { Candle, CandleRange } from "@/lib/feeds/sources/upstox";
import { useEffect, useState } from "react";

/** Historical candles for one symbol/range — refetches on symbol/range change, no polling (historical data). */
export function useCandles(symbol: string | null, range: CandleRange, enabled: boolean) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !symbol) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/feeds/upstox/candles?symbol=${encodeURIComponent(symbol)}&range=${range}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          setCandles(json.candles ?? []);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load candles");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range, enabled]);

  return { candles, loading, error };
}
