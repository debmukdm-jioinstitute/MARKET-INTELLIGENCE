"use client";

import type { TradingDeskResult } from "@/lib/ai/trading-desk";
import type { SiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import type { FullMarketQuote } from "@/lib/feeds/sources/upstox";
import { useCallback } from "react";
import useSWR from "swr";
import { useLandingDashboardSeed, type LandingDashboardSeed } from "./landing-dashboard-context";

async function loadResearch(url: string): Promise<ResearchDetailPayload> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as ResearchDetailPayload;
}

async function loadSiteBrief(): Promise<SiteWideExecutiveBrief | null> {
  const res = await fetch("/api/brief", { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.siteWideBrief as SiteWideExecutiveBrief | undefined) ?? null;
}

async function loadLandingDesk(url: string): Promise<TradingDeskResult> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as TradingDeskResult;
}

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
  const seed = useLandingDashboardSeed();
  const { data, error, isLoading } = useSWR<IndiaDashboardPayload>("/api/feeds/india-dashboard", loadDashboard, {
    refreshInterval: refreshMs,
    fallbackData: (seed as IndiaDashboardPayload | undefined) ?? undefined,
    revalidateOnMount: true,
  });
  const dashboard: LandingDashboardSeed | null = data ?? seed ?? null;
  return { dashboard, loading: isLoading && !data && !seed, error };
}

export function useLandingResearch(symbol: string) {
  const url = `/api/feeds/research/${encodeURIComponent(symbol)}`;
  const { data, error, isLoading } = useSWR<ResearchDetailPayload>(url, loadResearch, { revalidateOnFocus: false });
  return { research: data ?? null, loading: isLoading && !data, error };
}

export function useLandingSiteBrief(refreshMs = 300_000) {
  const { data } = useSWR("landing-site-brief", loadSiteBrief, { refreshInterval: refreshMs, revalidateOnFocus: false });
  return data ?? null;
}

export function useLandingAiDesk(symbol: string) {
  const url = `/api/marketing/landing-ai-desk?symbol=${encodeURIComponent(symbol)}`;
  const { data, error, isLoading } = useSWR<TradingDeskResult>(url, loadLandingDesk, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  });
  return { desk: data ?? null, loading: isLoading && !data, error };
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
