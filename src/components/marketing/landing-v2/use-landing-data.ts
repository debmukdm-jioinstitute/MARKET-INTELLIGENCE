"use client";

import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import type { FullMarketQuote } from "@/lib/feeds/sources/upstox";
import { useCallback } from "react";
import useSWR from "swr";

async function loadDashboard(url: string): Promise<IndiaDashboardPayload> {
  const quickRes = await fetch(`${url}?quick=1`, { cache: "no-store" });
  if (!quickRes.ok) throw new Error(`HTTP ${quickRes.status}`);
  const quick = (await quickRes.json()) as IndiaDashboardPayload;
  try {
    const fullRes = await fetch(url, { cache: "no-store" });
    if (fullRes.ok) return (await fullRes.json()) as IndiaDashboardPayload;
  } catch {
    /* keep quick */
  }
  return quick;
}

async function loadQuote(url: string): Promise<FullMarketQuote> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as FullMarketQuote;
}

export function useLandingDashboard(refreshMs = 55_000) {
  const { data, error, isLoading } = useSWR<IndiaDashboardPayload>("/api/feeds/india-dashboard", loadDashboard, {
    refreshInterval: refreshMs,
  });
  return { dashboard: data ?? null, loading: isLoading && !data, error };
}

export function useLandingQuote(symbol: string | null) {
  const url = symbol ? `/api/feeds/upstox/quote?symbol=${encodeURIComponent(symbol)}` : null;
  const { data, isLoading } = useSWR<FullMarketQuote>(url, loadQuote, { refreshInterval: 12_000 });
  return { quote: data ?? null, loading: isLoading && !data };
}

export function useLandingQuotes(symbols: readonly string[]) {
  const fetcher = useCallback(async () => {
    const entries = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const q = await loadQuote(`/api/feeds/upstox/quote?symbol=${encodeURIComponent(symbol)}`);
          return [symbol, q] as const;
        } catch {
          return [symbol, null] as const;
        }
      }),
    );
    return Object.fromEntries(entries) as Record<string, FullMarketQuote | null>;
  }, [symbols]);

  const key = symbols.length ? `landing-quotes:${symbols.join(",")}` : null;
  const { data } = useSWR(key, fetcher, { refreshInterval: 15_000 });
  return data ?? {};
}
