"use client";

import type { LiveQuote } from "@/lib/feeds/types";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

/** LTP for the curated India-equity instrument list — src/lib/feeds/india/instruments.ts. */
export function useIndiaEquities(refreshMs = 10_000) {
  const { data, error, isLoading, mutate } = useSWR<{ quotes: LiveQuote[] }>(
    "/api/feeds/upstox/india-equities",
    fetcher,
    { refreshInterval: refreshMs }
  );

  return { 
    quotes: data?.quotes ?? [], 
    loading: isLoading && !data, 
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate() 
  };
}
