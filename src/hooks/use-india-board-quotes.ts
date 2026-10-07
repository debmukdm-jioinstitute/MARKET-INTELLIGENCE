"use client";

import type { IndiaBoardQuotesPayload } from "@/lib/macro/build-india-board-quotes";
import useSWR from "swr";

const loadIndiaBoardQuotes = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as IndiaBoardQuotesPayload;
};

export function useIndiaBoardQuotes(refreshMs = 90_000) {
  const { data, error, isLoading, mutate } = useSWR<IndiaBoardQuotesPayload>(
    "/api/macro/india-board-quotes",
    loadIndiaBoardQuotes,
    { refreshInterval: refreshMs },
  );

  return {
    data: data ?? null,
    loading: isLoading && !data,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate(),
  };
}
