"use client";

import type { OfferCategory, OfferReport } from "@/lib/feeds/offers/types";
import { useCallback, useState } from "react";
import useSWR from "swr";

export interface UseOffersReportOptions {
  /** Polling interval in ms. Default is 30,000 for ncd-subscription (live bidding) and 60,000 for standard filings */
  refreshInterval?: number;
  /** Whether auto-refresh is active (default true) */
  autoRefresh?: boolean;
}

async function loadOffersReport(key: string): Promise<OfferReport> {
  const res = await fetch(key, { cache: "no-cache" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<OfferReport>;
}

export function useOffersReport(
  category: OfferCategory,
  year?: number,
  options?: UseOffersReportOptions,
) {
  const y = year ?? new Date().getFullYear();
  const autoRefresh = options?.autoRefresh ?? true;
  // 30 seconds for live subscription bidding on BSE/NSE; 60 seconds for NCD, rights, buybacks, OFS
  const defaultInterval = category === "ncd-subscription" ? 30_000 : 60_000;
  const interval = autoRefresh ? (options?.refreshInterval ?? defaultInterval) : 0;

  const [refreshing, setRefreshing] = useState(false);

  const key = `/api/feeds/offers?category=${category}&year=${y}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<OfferReport>(
    key,
    loadOffersReport,
    {
      refreshInterval: interval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 4_000,
      keepPreviousData: true,
    },
  );

  const refresh = useCallback(
    async (force = true) => {
      setRefreshing(true);
      try {
        const refreshUrl = `${key}&refresh=${force ? "true" : "false"}&_t=${Date.now()}`;
        const fresh = await loadOffersReport(refreshUrl);
        await mutate(fresh, { revalidate: false });
        return fresh;
      } finally {
        setRefreshing(false);
      }
    },
    [key, mutate],
  );

  return {
    report: data,
    loading: isLoading && !data,
    isValidating: isValidating || refreshing,
    refreshing,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh,
    lastUpdated: data?.source?.asOf ? new Date(data.source.asOf) : null,
    intervalMs: defaultInterval,
  };
}
