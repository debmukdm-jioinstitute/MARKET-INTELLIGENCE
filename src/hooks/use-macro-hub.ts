"use client";

import type { IndiaMacroHubPayload } from "@/lib/macro/types";
import { useCallback, useEffect, useState } from "react";

export function useMacroHub(refreshMs = 120_000) {
  const [data, setData] = useState<IndiaMacroHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/macro/india", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as IndiaMacroHubPayload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load macro hub");
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
