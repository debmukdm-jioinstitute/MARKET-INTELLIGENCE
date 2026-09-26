"use client";

import type { WorldIndicesPayload } from "@/lib/macro/build-world-indices";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

export function useWorldIndices(refreshMs = 90_000) {
  const { data, error, isLoading, mutate } = useSWR<WorldIndicesPayload>(
    "/api/macro/world-indices",
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
