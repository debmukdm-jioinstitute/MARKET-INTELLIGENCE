"use client";

import { useAuth } from "@/components/providers/auth-provider";
import type { WatchlistItem } from "@/lib/watchlist/store";
import useSWR from "swr";
import { useCallback } from "react";

type Payload = { items: WatchlistItem[]; canEdit: boolean; dbConfigured?: boolean };

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Payload>);

export type AddWatchlistInput = {
  market: "IN" | "US";
  symbol: string;
  name: string;
  sector?: string | null;
  note?: string | null;
};

export function useWatchlist(refreshMs = 60_000) {
  const { ready, isGuest } = useAuth();
  const locked = !ready || isGuest;

  const { data, error, isLoading, mutate } = useSWR<Payload>(
    ready && !locked ? "/api/watchlist" : null,
    fetcher,
    { refreshInterval: refreshMs },
  );

  const reload = useCallback(() => mutate(), [mutate]);

  const add = useCallback(
    async (input: AddWatchlistInput) => {
      if (locked) throw new Error("Log in or create an account to use a watchlist");
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await reload();
      return json.item as WatchlistItem;
    },
    [locked, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      if (locked) throw new Error("Log in or create an account to use a watchlist");
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      await reload();
    },
    [locked, reload],
  );

  return {
    locked,
    items: data?.items ?? [],
    loading: isLoading && !data,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    dbConfigured: data?.dbConfigured ?? true,
    reload,
    add,
    remove,
  };
}
