"use client";

import type { OptionChainSnapshot } from "@/lib/feeds/derivatives/types";
import { useCallback, useEffect, useState } from "react";

/** Fetches available expiries for an underlying, auto-selecting the nearest one. */
export function useOptionExpiries(underlyingKey: string) {
  const [expiries, setExpiries] = useState<string[]>([]);
  const [expiry, setExpiry] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/feeds/upstox/option-expiries?underlying=${encodeURIComponent(underlyingKey)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          const list: string[] = json.expiries ?? [];
          setExpiries(list);
          setExpiry(list[0] ?? "");
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load expiries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [underlyingKey]);

  return { expiries, expiry, setExpiry, loading, error };
}

/** Polls the option chain for one underlying/expiry — Greeks/OI move faster than macro data but not tick-fast. */
export function useOptionChain(underlyingKey: string, expiry: string, refreshMs = 18_000) {
  const [data, setData] = useState<OptionChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!underlyingKey || !expiry) return;
    try {
      const res = await fetch(
        `/api/feeds/upstox/option-chain?underlying=${encodeURIComponent(underlyingKey)}&expiry=${expiry}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load option chain");
    } finally {
      setLoading(false);
    }
  }, [underlyingKey, expiry]);

  useEffect(() => {
    if (!underlyingKey || !expiry) return;
    setLoading(true);
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [underlyingKey, expiry, reload, refreshMs]);

  return { data, loading, error, reload };
}
