"use client";

import { useEffect, useState } from "react";
import type { LiveCompanySentiment } from "@/lib/reddit-sentiment/fetch-live";
import { RetailSentimentEngineView } from "./retail-sentiment-engine-view";
import { Loader2 } from "lucide-react";

/** Fetches real, live Reddit sentiment for `symbol` via /api/reddit/sentiment and renders it —
 * the one place both the Reddit intelligence page and the research page's Reddit panel should
 * pull from, so there's a single real data path instead of each screen inventing its own. */
export function LiveSentimentPanel({ symbol }: { symbol: string }) {
  const [sentiment, setSentiment] = useState<LiveCompanySentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/reddit/sentiment?symbol=${encodeURIComponent(symbol)}`)
      .then(async (r) => {
        const j = (await r.json()) as { companySentiment?: LiveCompanySentiment; error?: string };
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        return j.companySentiment ?? null;
      })
      .then((data) => {
        if (!cancelled) setSentiment(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load Reddit data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center gap-2 text-sm text-muted-foreground rounded-xl bg-card border border-border/40">
        <Loader2 className="w-4 h-4 animate-spin" />
        Searching Reddit for {symbol}…
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center text-sm text-destructive rounded-xl bg-card border border-border/40">{error}</div>;
  }
  if (!sentiment) return null;
  return <RetailSentimentEngineView sentiment={sentiment} />;
}
