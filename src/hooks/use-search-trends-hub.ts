"use client";

import type { SearchTrendHubPayload } from "@/lib/search-trends/types";
import useSWR from "swr";

async function loadSearchTrendHub(url: string): Promise<SearchTrendHubPayload> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SearchTrendHubPayload>;
}

export function useSearchTrendHub(query?: { category?: string; keyword?: string }) {
  const params = new URLSearchParams();
  if (query?.category) params.set("category", query.category);
  if (query?.keyword?.trim()) params.set("keyword", query.keyword.trim());
  const path = params.toString() ? `/api/feeds/search-trends?${params}` : "/api/feeds/search-trends";

  const { data, error, isLoading, mutate } = useSWR(path, loadSearchTrendHub, {
    refreshInterval: 30 * 60 * 1000,
  });

  return {
    data: data ?? null,
    loading: isLoading && !data,
    error: error ? (error instanceof Error ? error.message : "Load failed") : null,
    reload: mutate,
  };
}
