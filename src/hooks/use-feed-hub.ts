"use client";

import type { FeedHubPayload, LiveQuote } from "@/lib/feeds/types";
import { useCallback, useEffect, useState } from "react";

export function useFeedHub(refreshMs = 60_000) {
  const [data, setData] = useState<FeedHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/feeds/hub", { cache: "no-store" });
      if (!res.ok) throw new Error(`Feeds HTTP ${res.status}`);
      const json = (await res.json()) as FeedHubPayload;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feeds");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  return { data, loading, error, reload };
}

export function quoteMap(data: FeedHubPayload | null) {
  const map = new Map<string, LiveQuote>();
  if (!data) return map;
  for (const q of data.quotes) map.set(q.symbol, q);
  return map;
}
