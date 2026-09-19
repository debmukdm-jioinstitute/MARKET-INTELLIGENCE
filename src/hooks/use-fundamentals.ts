"use client";

import type { FundamentalsSnapshot } from "@/lib/feeds/fundamentals/types";
import { useEffect, useState } from "react";

/** Fetches key ratios once per ISIN — no polling, ratios don't move intraday. */
export function useFundamentals(isin: string | null, enabled: boolean) {
  const [data, setData] = useState<FundamentalsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isin) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/feeds/upstox/fundamentals/${encodeURIComponent(isin)}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load fundamentals");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin, enabled]);

  return { data, loading, error };
}
