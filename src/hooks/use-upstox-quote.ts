"use client";

import type { FullMarketQuote } from "@/lib/feeds/sources/upstox";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

/** Polls a single India symbol's full market quote — only while `enabled` (e.g. a sheet is open). */
export function useUpstoxQuote(symbol: string | null, enabled: boolean, refreshMs = 6_000) {
  const url = enabled && symbol ? `/api/feeds/upstox/quote?symbol=${encodeURIComponent(symbol)}` : null;
  const { data, error, isLoading, mutate } = useSWR<FullMarketQuote>(url, fetcher, {
    refreshInterval: refreshMs,
  });

  return { 
    data: data ?? null, 
    loading: isLoading && !data && enabled, 
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate() 
  };
}
