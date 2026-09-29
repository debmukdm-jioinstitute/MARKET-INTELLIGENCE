"use client";

import type { LegalRiskHubPayload } from "@/lib/legal-risk/types";
import useSWR from "swr";

async function loadLegalRiskHub(url: string): Promise<LegalRiskHubPayload> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LegalRiskHubPayload>;
}

export function useLegalRiskHub(refreshMs = 120_000) {
  const { data, error, isLoading, mutate } = useSWR("/api/feeds/legal-risk", loadLegalRiskHub, {
    refreshInterval: refreshMs,
  });
  return {
    data: data ?? null,
    loading: isLoading && !data,
    error: error ? (error instanceof Error ? error.message : "Load failed") : null,
    reload: mutate,
  };
}
