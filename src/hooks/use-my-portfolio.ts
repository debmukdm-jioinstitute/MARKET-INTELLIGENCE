"use client";

import type { Holding, PortfolioAnalysis } from "@/lib/my-portfolio/types";
import { REALISTIC_DEFAULT_HOLDINGS } from "@/lib/my-portfolio/defaults";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mi_user_holdings_v2";

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

function getLocalHoldings(): Holding[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Holding[];
  } catch {
    return null;
  }
}

function setLocalHoldings(holdings: Holding[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    window.dispatchEvent(new CustomEvent("mi_portfolio_updated", { detail: holdings }));
  } catch (e) {
    console.warn("Failed to write holdings to localStorage:", e);
  }
}

export function useMyPortfolio(refreshMs = 60_000) {
  const [data, setData] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const local = getLocalHoldings();
      let res: Response;
      if (local && Array.isArray(local)) {
        res = await fetch("/api/portfolio/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings: local }),
          cache: "no-store",
        });
      } else {
        res = await fetch("/api/portfolio/analysis", { cache: "no-store" });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const analysis = json as PortfolioAnalysis;
      setData(analysis);
      setError(null);

      // If localStorage had nothing, seed with the returned holdings so user can mutate
      if (!local && analysis.positions) {
        const seeded: Holding[] = analysis.positions.map((p) => ({
          id: p.id,
          market: p.market,
          symbol: p.symbol,
          instrumentKey: null,
          name: p.name,
          sector: p.sector,
          currency: p.currency,
          shares: p.shares,
          avgCost: p.avgCost,
          addedAt: new Date().toISOString().slice(0, 10),
        }));
        setLocalHoldings(seeded);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const handleUpdate = () => {
      reload();
    };
    window.addEventListener("mi_portfolio_updated", handleUpdate);
    const id = window.setInterval(reload, refreshMs);
    return () => {
      window.removeEventListener("mi_portfolio_updated", handleUpdate);
      window.clearInterval(id);
    };
  }, [reload, refreshMs]);

  const addHolding = useCallback(
    async (input: AddHoldingInput) => {
      const newHolding: Holding = {
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        market: input.market,
        symbol: input.symbol.toUpperCase(),
        instrumentKey: input.instrumentKey ?? null,
        name: input.name,
        sector: input.sector ?? null,
        currency: input.currency,
        shares: input.shares,
        avgCost: input.avgCost,
        addedAt: input.addedAt ?? new Date().toISOString().slice(0, 10),
      };

      const current = getLocalHoldings() ?? REALISTIC_DEFAULT_HOLDINGS;
      const updated = [...current, newHolding];
      setLocalHoldings(updated);

      try {
        await fetch("/api/portfolio/holdings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
      } catch (e) {
        console.warn("Backend holding sync skipped:", e);
      }

      await reload();
      return newHolding;
    },
    [reload],
  );

  const removeHolding = useCallback(
    async (id: string) => {
      const current = getLocalHoldings() ?? REALISTIC_DEFAULT_HOLDINGS;
      const updated = current.filter((h) => h.id !== id && h.symbol !== id);
      setLocalHoldings(updated);

      try {
        await fetch(`/api/portfolio/holdings/${id}`, { method: "DELETE" });
      } catch (e) {
        console.warn("Backend delete sync skipped:", e);
      }

      await reload();
    },
    [reload],
  );

  const editHolding = useCallback(
    async (id: string, patch: { shares?: number; avgCost?: number }) => {
      const current = getLocalHoldings() ?? REALISTIC_DEFAULT_HOLDINGS;
      const updated = current.map((h) =>
        h.id === id || h.symbol === id
          ? {
              ...h,
              shares: patch.shares ?? h.shares,
              avgCost: patch.avgCost ?? h.avgCost,
            }
          : h,
      );
      setLocalHoldings(updated);

      try {
        await fetch(`/api/portfolio/holdings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch (e) {
        console.warn("Backend edit sync skipped:", e);
      }

      await reload();
    },
    [reload],
  );

  const resetToDefault = useCallback(async () => {
    setLocalHoldings(REALISTIC_DEFAULT_HOLDINGS);
    await reload();
  }, [reload]);

  const clearHoldings = useCallback(async () => {
    setLocalHoldings([]);
    await reload();
  }, [reload]);

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

  return {
    data,
    loading,
    error,
    reload,
    addHolding,
    removeHolding,
    editHolding,
    resetToDefault,
    clearHoldings,
    updateBenchmark,
  };
}
