"use client";

import type { LiveTickerPayload } from "@/lib/macro/build-live-ticker";
import { useCallback, useEffect, useState } from "react";

export function useLiveTicker(refreshMs = 55_000) {
  const [data, setData] = useState<LiveTickerPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/macro/ticker", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setData(json as LiveTickerPayload);
    } catch {
      /* keep last tape */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  return { data, loading, reload };
}
