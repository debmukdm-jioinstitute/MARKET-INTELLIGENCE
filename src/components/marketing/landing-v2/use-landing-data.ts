"use client";

import type { TradingDeskResult } from "@/lib/ai/trading-desk";
import type { SiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import type { FullMarketQuote } from "@/lib/feeds/sources/upstox";
import { useCallback } from "react";
import useSWR from "swr";
import type { ProofSymbol } from "@/lib/marketing/landing-v2/copy";
import {
  useLandingDashboardSeed,
  useLandingResearchSeed,
  useLandingSiteBriefSeed,
  type LandingDashboardSeed,
} from "./landing-dashboard-context";

async function loadResearch(url: string): Promise<ResearchDetailPayload | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ResearchDetailPayload;
  } catch {
    return null;
  }
}

async function loadSiteBrief(): Promise<SiteWideExecutiveBrief | null> {
  const res = await fetch("/api/brief", { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.siteWideBrief as SiteWideExecutiveBrief | undefined) ?? null;
}

async function loadLandingDesk(url: string): Promise<TradingDeskResult | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as TradingDeskResult & { fallback?: string };
    if (json.fallback) return null;
    return json;
  } catch {
    return null;
  }
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
    keepPreviousData: true,
    shouldRetryOnError: false,
  });
  const dashboard: LandingDashboardSeed | null = data ?? seed ?? null;
  return { dashboard, loading: isLoading && !dashboard, error: error && !dashboard ? error : undefined };
}

export function useLandingResearch(symbol: ProofSymbol) {
  const seed = useLandingResearchSeed(symbol);
  const url = `/api/feeds/research/${encodeURIComponent(symbol)}`;
  const { data, isLoading } = useSWR<ResearchDetailPayload | null>(url, loadResearch, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    fallbackData: seed ?? undefined,
  });
  return { research: data ?? seed ?? null, loading: isLoading && !data && !seed, error: undefined };
}

export function useLandingSiteBrief(refreshMs = 300_000) {
  const seed = useLandingSiteBriefSeed();
  const { data } = useSWR("landing-site-brief", loadSiteBrief, {
    refreshInterval: refreshMs,
    revalidateOnFocus: false,
    fallbackData: seed ?? undefined,
  });
  return data ?? seed ?? null;
}

export function useLandingAiDesk(symbol: string) {
  const url = `/api/marketing/landing-ai-desk?symbol=${encodeURIComponent(symbol)}`;
  const { data, isLoading } = useSWR<TradingDeskResult | null>(url, loadLandingDesk, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
    shouldRetryOnError: false,
  });
  return { desk: data ?? null, loading: isLoading && !data, error: undefined };
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
