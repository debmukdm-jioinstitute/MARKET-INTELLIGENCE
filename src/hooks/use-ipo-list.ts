"use client";

import type { IpoDetail, IpoListing, IpoStatus } from "@/lib/feeds/ipo/types";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

export function useIpoList(status: IpoStatus, refreshMs = 300_000) {
  const { data, error, isLoading } = useSWR<{ ipos: IpoListing[] }>(
    `/api/feeds/ipo?status=${status}`,
    fetcher,
    { refreshInterval: refreshMs }
  );

  return { 
    ipos: data?.ipos ?? [], 
    loading: isLoading && !data, 
    error: error instanceof Error ? error.message : error ? String(error) : null 
  };
}

export function useIpoDetail(id: string | null, enabled: boolean) {
  const url = enabled && id ? `/api/feeds/ipo/${encodeURIComponent(id)}` : null;
  const { data, error, isLoading } = useSWR<IpoDetail>(url, fetcher);

  return { 
    detail: data ?? null, 
    loading: isLoading && !data && enabled, 
    error: error instanceof Error ? error.message : error ? String(error) : null 
  };
}
