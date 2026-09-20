"use client";

import type { MacroTapePayload } from "@/lib/macro/build-tape";
import { useCallback, useEffect, useState } from "react";

export function useMacroTape(refreshMs = 90_000) {
  const [data, setData] = useState<MacroTapePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/macro/tape", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as MacroTapePayload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load market tape");
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
