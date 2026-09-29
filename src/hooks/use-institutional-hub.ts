"use client";

import type { InstitutionalIntelligencePayload } from "@/lib/institutional/types";
import useSWR from "swr";

async function loadInstitutionalHub(url: string): Promise<InstitutionalIntelligencePayload> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<InstitutionalIntelligencePayload>;
}

export function useInstitutionalHub(refreshMs = 60_000) {
  const { data, error, isLoading, mutate } = useSWR("/api/feeds/institutional", loadInstitutionalHub, {
    refreshInterval: refreshMs,
  });
  return {
    data: data ?? null,
    loading: isLoading && !data,
    error: error ? (error instanceof Error ? error.message : "Load failed") : null,
    reload: mutate,
  };
}
