"use client";

import type { MacroTapePayload } from "@/lib/macro/build-tape";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

export function useMacroTape(refreshMs = 90_000) {
  const { data, error, isLoading, mutate } = useSWR<MacroTapePayload>("/api/macro/tape", fetcher, {
    refreshInterval: refreshMs,
  });

  return { 
    data: data ?? null, 
    loading: isLoading && !data, 
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate() 
  };
}
