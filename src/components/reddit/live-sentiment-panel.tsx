"use client";

import { useEffect, useState, useCallback } from "react";
import type { LiveCompanySentiment } from "@/lib/reddit-sentiment/fetch-live";
import { RetailSentimentEngineView } from "./retail-sentiment-engine-view";
import { Loader2 } from "lucide-react";

/**
 * Fetches real Reddit sentiment for `symbol` via /api/reddit/sentiment and renders it.
 * Supports manual re-crawling with refresh token/cache revalidation.
 */
export function LiveSentimentPanel({ symbol }: { symbol: string }) {
  const [sentiment, setSentiment] = useState<LiveCompanySentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = `/api/reddit/sentiment?symbol=${encodeURIComponent(symbol)}${isRefresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.companySentiment) {
        setSentiment(json.companySentiment);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Reddit data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchSentiment(false);
  }, [fetchSentiment]);

  if (loading && !sentiment) {
    return (
      <div className="p-12 flex items-center justify-center gap-2.5 text-sm text-muted-foreground rounded-2xl bg-card border border-border/60 shadow-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Searching Indian subreddits & analyzing discussions with FinBERT for {symbol}…</span>
      </div>
    );
  }

  if (error && !sentiment) {
    return (
      <div className="p-8 text-center text-sm text-destructive rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
        <p>{error}</p>
        <button
          onClick={() => fetchSentiment(true)}
          className="text-xs text-primary font-semibold hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!sentiment) return null;

  return (
    <RetailSentimentEngineView
      sentiment={sentiment}
      onRefresh={() => fetchSentiment(true)}
      isRefreshing={refreshing}
    />
  );
}
