"use client";

import type { IpoDetail, IpoListing, IpoStatus } from "@/lib/feeds/ipo/types";
import { useCallback, useEffect, useState } from "react";

export function useIpoList(status: IpoStatus, refreshMs = 300_000) {
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/feeds/ipo?status=${status}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setIpos(json.ipos ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load IPOs");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  return { ipos, loading, error };
}

export function useIpoDetail(id: string | null, enabled: boolean) {
  const [detail, setDetail] = useState<IpoDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/feeds/ipo/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          setDetail(json);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load IPO detail");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, enabled]);

  return { detail, loading, error };
}
