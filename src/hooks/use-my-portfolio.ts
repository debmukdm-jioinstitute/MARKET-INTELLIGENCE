"use client";

import type { Holding, PortfolioAnalysis } from "@/lib/my-portfolio/types";
import { useAuth } from "@/components/providers/auth-provider";
import useSWR from "swr";
import { useCallback, useSyncExternalStore } from "react";

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

let cachedRaw: string | null = null;
let cachedHoldings: Holding[] | null = null;

function getLocalHoldings(): Holding[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === cachedRaw) return cachedHoldings;
    cachedRaw = raw;
    cachedHoldings = JSON.parse(raw) as Holding[];
    return cachedHoldings;
  } catch {
    return null;
  }
}

function setLocalHoldings(holdings: Holding[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    window.dispatchEvent(new Event("mi_portfolio_updated"));
  } catch (e) {
    console.warn("Failed to write holdings to localStorage:", e);
  }
}

function subscribeHoldings(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("mi_portfolio_updated", callback);
  return () => window.removeEventListener("mi_portfolio_updated", callback);
}

const fetcher = async ([url, holdings]: [string, Holding[] | null, boolean]) => {
  let res: Response;
  if (holdings && Array.isArray(holdings)) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings }),
    });
  } else {
    res = await fetch(url);
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  
  // Sync the account's server-side book into local storage
  if (!holdings && json.positions && json.positions.length > 0) {
    const seeded: Holding[] = json.positions.map((p: any) => ({
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
  
  return json as PortfolioAnalysis;
};

export function useMyPortfolio(refreshMs = 60_000) {
  const { ready, isGuest } = useAuth();
  const locked = !ready || isGuest;
  // Guests (and the moment before the session is known) never read or write holdings: the book stays at zero.
  const snapshot = useCallback(() => (locked ? null : getLocalHoldings()), [locked]);
  const localHoldings = useSyncExternalStore(subscribeHoldings, snapshot, () => null);
  const requireAccount = useCallback(() => {
    if (locked) throw new Error("Log in or create an account to add or import holdings");
  }, [locked]);

  const { data, error, isLoading, mutate } = useSWR<PortfolioAnalysis>(
    ready ? ["/api/portfolio/analysis", localHoldings, isGuest] : null,
    fetcher,
    { refreshInterval: refreshMs }
  );

  const reload = useCallback(() => mutate(), [mutate]);

  const addHolding = useCallback(
    async (input: AddHoldingInput) => {
      requireAccount();
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

      const current = getLocalHoldings() ?? [];
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
    [reload, requireAccount],
  );

  const removeHolding = useCallback(
    async (id: string) => {
      requireAccount();
      const current = getLocalHoldings() ?? [];
      const updated = current.filter((h) => h.id !== id && h.symbol !== id);
      setLocalHoldings(updated);

      try {
        await fetch(`/api/portfolio/holdings/${id}`, { method: "DELETE" });
      } catch (e) {
        console.warn("Backend delete sync skipped:", e);
      }

      await reload();
    },
    [reload, requireAccount],
  );

  const editHolding = useCallback(
    async (id: string, patch: { shares?: number; avgCost?: number }) => {
      requireAccount();
      const current = getLocalHoldings() ?? [];
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
    [reload, requireAccount],
  );

  const resetToDefault = useCallback(async () => {
    setLocalHoldings([]);
    await reload();
  }, [reload]);

  const clearHoldings = useCallback(async () => {
    setLocalHoldings([]);
    await reload();
  }, [reload]);

  const importHoldings = useCallback(
    async (imported: Holding[], mode: "replace" | "append" = "replace") => {
      requireAccount();
      let updated: Holding[];
      if (mode === "replace") {
        updated = [...imported];
      } else {
        const current = getLocalHoldings() ?? [];
        const existingSymbols = new Set(imported.map((h) => h.symbol.toUpperCase()));
        updated = [...current.filter((h) => !existingSymbols.has(h.symbol.toUpperCase())), ...imported];
      }
      setLocalHoldings(updated);

      try {
        await Promise.all(
          imported.map((h) =>
            fetch("/api/portfolio/holdings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                market: h.market,
                symbol: h.symbol,
                instrumentKey: h.instrumentKey,
                name: h.name,
                sector: h.sector,
                currency: h.currency,
                shares: h.shares,
                avgCost: h.avgCost,
                addedAt: h.addedAt,
              }),
            })
          )
        );
      } catch (e) {
        console.warn("Backend batch holding sync skipped:", e);
      }

      await reload();
      return updated;
    },
    [reload, requireAccount],
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

  return {
    locked,
    data: data ?? null,
    loading: isLoading && !data,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload,
    addHolding,
    removeHolding,
    editHolding,
    resetToDefault,
    clearHoldings,
    importHoldings,
    updateBenchmark,
  };
}
