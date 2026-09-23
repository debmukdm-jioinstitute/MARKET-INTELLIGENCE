"use client";

import type { LiveTickerPayload } from "@/lib/macro/build-live-ticker";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useLiveTicker(refreshMs = 55_000) {
  const { data, isLoading, mutate } = useSWR<LiveTickerPayload>("/api/macro/ticker", fetcher, {
    refreshInterval: refreshMs,
  });

  return { 
    data: data ?? null, 
    loading: isLoading && !data, 
    reload: () => mutate() 
  };
}
