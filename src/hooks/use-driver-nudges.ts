"use client";

import useSWR from "swr";
import { useMemo } from "react";
import type { BetaPayload } from "@/lib/transmission/betas";
import type { Shocks } from "@/lib/transmission/scenario";
import { buildNudges } from "@/lib/guide/driver-rules";

type TransmissionPayload = { betas: BetaPayload; today: { shocks: Shocks } | null };

// Module-level loader keeps SWR identity stable (see AGENTS.md: React update loops).
async function loadTransmission(url: string): Promise<TransmissionPayload> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as TransmissionPayload;
}

/** Shared, cached transmission betas + today's global moves (one SWR key for every nudge consumer). */
export function useTransmission() {
  const { data, isLoading } = useSWR("/api/transmission", loadTransmission, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return { betas: data?.betas ?? null, shocks: data?.today?.shocks ?? null, loading: isLoading && !data };
}

/** Instant, rule-based driver nudges for a stock. Reuses the cached /api/transmission payload. */
export function useDriverNudges(symbol: string, name: string | undefined) {
  const { data, isLoading } = useSWR("/api/transmission", loadTransmission, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const result = useMemo(
    () => (symbol ? buildNudges(symbol, name ?? "", data?.betas, data?.today?.shocks) : { sectorLabel: null, nudges: [] }),
    [symbol, name, data],
  );
  return { ...result, loading: isLoading && !data };
}
