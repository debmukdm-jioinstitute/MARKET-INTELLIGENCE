"use client";

import type { CommodityQuotesPayload } from "@/lib/macro/build-commodity-quotes";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

export function useCommodityQuotes(refreshMs = 90_000) {
  const { data, error, isLoading, mutate } = useSWR<CommodityQuotesPayload>(
    "/api/macro/commodity-quotes",
    fetcher,
    { refreshInterval: refreshMs },
  );

  return {
    data: data ?? null,
    loading: isLoading && !data,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate(),
  };
}
