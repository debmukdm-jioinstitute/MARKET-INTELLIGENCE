"use client";

import type {
  AutoPayload,
  FbilPayload,
  GstPayload,
  MonsoonPayload,
  PowerPayload,
  UpiPayload,
  WorldBankPayload,
} from "@/lib/macro/alt-types";
import useSWR from "swr";

/** Module-level loader: stable identity across renders (see AGENTS.md → React update loops). */
async function loadJson(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

function useAlt<T>(path: string, refreshMs: number) {
  const { data, error, isLoading } = useSWR<T>(path, loadJson, { refreshInterval: refreshMs, revalidateOnFocus: false });
  return { data: data ?? null, loading: isLoading && !data, error: error instanceof Error ? error.message : error ? String(error) : null };
}

const HOUR = 3_600_000;
export const useFbilRates = () => useAlt<FbilPayload>("/api/macro/fbil-rates", 6 * HOUR);
export const useWorldBankIndia = () => useAlt<WorldBankPayload>("/api/macro/worldbank", 24 * HOUR);
export const useUpiStats = () => useAlt<UpiPayload>("/api/macro/upi", 24 * HOUR);
export const useGstCollections = () => useAlt<GstPayload>("/api/macro/gst", 24 * HOUR);
export const useAutoSales = () => useAlt<AutoPayload>("/api/macro/auto-sales", 24 * HOUR);
export const usePowerDemand = () => useAlt<PowerPayload>("/api/macro/power", 6 * HOUR);
export const useMonsoon = () => useAlt<MonsoonPayload>("/api/macro/monsoon", 6 * HOUR);
