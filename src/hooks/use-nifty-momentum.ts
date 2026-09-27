"use client";

import { computeNiftyMomentum, type NiftyMomentumSnapshot } from "@/lib/market/nifty-technicals";
import useSWR from "swr";

const fetcher = async (): Promise<NiftyMomentumSnapshot> => {
  const res = await fetch("/api/feeds/yahoo/history?symbol=%5ENSEI&range=1y", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { points?: { date: string; value: number }[] };
  return computeNiftyMomentum(json.points ?? []);
};

export function useNiftyMomentum() {
  const { data, error, isLoading } = useSWR("nifty-momentum", fetcher, { refreshInterval: 300_000 });
  return { momentum: data ?? null, loading: isLoading, error: error ? String(error) : null };
}
