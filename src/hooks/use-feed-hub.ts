"use client";

import type { FeedHubPayload, LiveQuote } from "@/lib/feeds/types";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Feeds HTTP ${res.status}`);
  return json;
};

export function useFeedHub(refreshMs = 60_000) {
  const { data, error, isLoading, mutate } = useSWR<FeedHubPayload>("/api/feeds/hub", fetcher, {
    refreshInterval: refreshMs,
  });

  return { 
    data: data ?? null, 
    loading: isLoading && !data, 
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate(),
    hubSyncedAt: data?.fetchedAt
  };
}

export function quoteMap(data: FeedHubPayload | null) {
  const map = new Map<string, LiveQuote>();
  if (!data) return map;
  for (const q of data.quotes) map.set(q.symbol, q);
  return map;
}
