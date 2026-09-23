"use client";

import type { IndiaMacroHubPayload } from "@/lib/macro/types";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

export function useMacroHub(refreshMs = 120_000) {
  const { data, error, isLoading, mutate } = useSWR<IndiaMacroHubPayload>("/api/macro/india", fetcher, {
    refreshInterval: refreshMs,
  });

  return { 
    data: data ?? null, 
    loading: isLoading && !data, 
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate() 
  };
}
