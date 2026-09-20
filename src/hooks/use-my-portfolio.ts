"use client";

import type { PortfolioAnalysis } from "@/lib/my-portfolio/types";
import { useCallback, useEffect, useState } from "react";

export type AddHoldingInput = {
  market: "IN" | "US";
  symbol: string;
  instrumentKey?: string | null;
  name: string;
  sector?: string | null;
  currency: "INR" | "USD";
  shares: number;
  avgCost: number;
  addedAt?: string;
};

export function useMyPortfolio(refreshMs = 60_000) {
  const [data, setData] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio/analysis", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as PortfolioAnalysis);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  const addHolding = useCallback(
    async (input: AddHoldingInput) => {
      const res = await fetch("/api/portfolio/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add holding");
      await reload();
      return json;
    },
    [reload],
  );

  const removeHolding = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/portfolio/holdings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to remove holding");
      }
      await reload();
    },
    [reload],
  );

  const editHolding = useCallback(
    async (id: string, patch: { shares?: number; avgCost?: number }) => {
      const res = await fetch(`/api/portfolio/holdings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to edit holding");
      }
      await reload();
    },
    [reload],
  );

  const updateBenchmark = useCallback(
    async (benchmark: string, name?: string) => {
      const res = await fetch("/api/portfolio/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benchmark, name }),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      await reload();
    },
    [reload],
  );

  return { data, loading, error, reload, addHolding, removeHolding, editHolding, updateBenchmark };
}
