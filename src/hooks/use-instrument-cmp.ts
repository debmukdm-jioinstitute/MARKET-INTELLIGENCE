"use client";

import type { SecurityDetailPayload } from "@/lib/feeds/security-detail";
import { useUpstoxQuote } from "@/hooks/use-upstox-quote";
import useSWR from "swr";

const securityFetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as SecurityDetailPayload;
};

/** Live CMP for add-holding / pickers — India via Upstox, US via security detail quote. */
export function useInstrumentCmp(
  market: "IN" | "US" | null,
  symbol: string | null,
  enabled: boolean,
) {
  const active = enabled && Boolean(market && symbol);
  const india = useUpstoxQuote(market === "IN" ? symbol : null, active && market === "IN");
  const usUrl =
    active && market === "US" && symbol
      ? `/api/feeds/security/${encodeURIComponent(symbol)}`
      : null;
  const { data: usData, isLoading: usLoading, error: usError } = useSWR<SecurityDetailPayload>(
    usUrl,
    securityFetcher,
    { refreshInterval: 15_000 },
  );

  if (market === "IN") {
    const prev = india.data?.ohlc.close ?? 0;
    return {
      price: india.data?.ltp ?? null,
      changePct: prev > 0 && india.data ? india.data.netChange / prev : null,
      loading: india.loading,
      error: india.error,
    };
  }

  if (market === "US") {
    const q = usData?.quote;
    return {
      price: q?.price ?? null,
      changePct: q?.changePct ?? null,
      loading: usLoading && !usData,
      error: usError instanceof Error ? usError.message : usError ? String(usError) : null,
    };
  }

  return { price: null, changePct: null, loading: false, error: null };
}
