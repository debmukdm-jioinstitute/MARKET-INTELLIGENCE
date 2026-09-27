"use client";

import useSWR from "swr";
import type { MarketShiftsPayload } from "@/lib/feeds/what-changed/types";
import { WHAT_CHANGED_REFRESH_MS } from "@/lib/feeds/what-changed/types";

async function loadWhatChanged(): Promise<MarketShiftsPayload> {
  const res = await fetch("/api/feeds/what-changed", { cache: "no-store" });
  if (!res.ok) throw new Error(`what-changed ${res.status}`);
  return res.json();
}

/** Polls on client so Home picks up each 3h server refresh without full page reload. */
export function useWhatChanged() {
  return useSWR("what-changed-v1", loadWhatChanged, {
    refreshInterval: WHAT_CHANGED_REFRESH_MS,
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
  });
}
