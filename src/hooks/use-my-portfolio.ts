"use client";

import type { BenchmarkId } from "@/lib/my-portfolio/benchmark-options";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/my-portfolio/defaults";
import type { Holding, PortfolioAnalysis, PortfolioSettings } from "@/lib/my-portfolio/types";
import { useAuth } from "@/components/providers/auth-provider";
import useSWR from "swr";
import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "mi_user_holdings_v2";
const SETTINGS_KEY = "mi_portfolio_settings_v1";

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
let cachedSettingsRaw: string | null = null;
let cachedSettings: PortfolioSettings | null = null;

function getHoldingsRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSettingsRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    return null;
  }
}

function getLocalHoldings(): Holding[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getHoldingsRaw();
    if (!raw) {
      cachedRaw = null;
      cachedHoldings = null;
      return null;
    }
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
    const next = JSON.stringify(holdings);
    if (cachedRaw === next) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    cachedRaw = next;
    cachedHoldings = holdings;
    window.dispatchEvent(new Event("mi_portfolio_updated"));
  } catch (e) {
    console.warn("Failed to write holdings to localStorage:", e);
  }
}

function subscribeHoldings(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const bump = () => callback();
  window.addEventListener("mi_portfolio_updated", bump);
  window.addEventListener("mi_portfolio_settings_updated", bump);
  return () => {
    window.removeEventListener("mi_portfolio_updated", bump);
    window.removeEventListener("mi_portfolio_settings_updated", bump);
  };
}

function getLocalSettings(): PortfolioSettings {
  if (typeof window === "undefined") return DEFAULT_PORTFOLIO_SETTINGS;
  try {
    const raw = getSettingsRaw();
    if (!raw) {
      cachedSettingsRaw = null;
      cachedSettings = null;
      return DEFAULT_PORTFOLIO_SETTINGS;
    }
    if (raw === cachedSettingsRaw && cachedSettings) return cachedSettings;
    const parsed = JSON.parse(raw) as Partial<PortfolioSettings>;
    cachedSettingsRaw = raw;
    cachedSettings = {
      name: parsed.name ?? DEFAULT_PORTFOLIO_SETTINGS.name,
      benchmark: parsed.benchmark ?? DEFAULT_PORTFOLIO_SETTINGS.benchmark,
      baseCurrency: "INR",
    };
    return cachedSettings;
  } catch {
    return DEFAULT_PORTFOLIO_SETTINGS;
  }
}

function setLocalSettings(settings: PortfolioSettings) {
  if (typeof window === "undefined") return;
  try {
    const next = JSON.stringify(settings);
    if (cachedSettingsRaw === next && cachedSettings) return;
    window.localStorage.setItem(SETTINGS_KEY, next);
    cachedSettingsRaw = next;
    cachedSettings = settings;
    window.dispatchEvent(new Event("mi_portfolio_settings_updated"));
  } catch {
    /* ignore */
  }
}

const fetcher = async ([url, holdings, , settings]: [string, Holding[] | null, boolean, PortfolioSettings]) => {
  let res: Response;
  if (holdings && Array.isArray(holdings)) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings, settings }),
    });
  } else {
    res = await fetch(url);
  }

  const json = await res.json();
  if (!res.ok) {
    const msg = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new Error(msg.slice(0, 200));
  }
  
  // Sync server book into local storage once (avoid SWR ↔ external store ping-pong).
  if (!holdings && json.positions && json.positions.length > 0 && !getLocalHoldings()?.length) {
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

type PortfolioAnalysisKey = readonly [
  string,
  string | null,
  boolean,
  PortfolioSettings["benchmark"],
  string,
];

function fetchPortfolioAnalysis([url, holdingsRaw, guest, benchmark, name]: PortfolioAnalysisKey) {
  const holdings = holdingsRaw ? getLocalHoldings() : null;
  return fetcher([
    url,
    holdings,
    guest,
    { ...DEFAULT_PORTFOLIO_SETTINGS, benchmark, name, baseCurrency: "INR" },
  ]);
}

export function useMyPortfolio(refreshMs = 60_000) {
  const { ready, isGuest } = useAuth();
  const locked = !ready || isGuest;
  // Guests (and the moment before the session is known) never read or write holdings: the book stays at zero.
  const holdingsRawSnapshot = useCallback(() => (locked ? null : getHoldingsRaw()), [locked]);
  const settingsRawSnapshot = useCallback(() => (locked ? null : getSettingsRaw()), [locked]);
  const holdingsRaw = useSyncExternalStore(subscribeHoldings, holdingsRawSnapshot, () => null);
  const settingsRaw = useSyncExternalStore(subscribeHoldings, settingsRawSnapshot, () => null);
  const localHoldings = useMemo(() => (locked ? null : getLocalHoldings()), [locked, holdingsRaw]);
  const localSettings = useMemo(
    () => (locked ? DEFAULT_PORTFOLIO_SETTINGS : getLocalSettings()),
    [locked, settingsRaw],
  );
  const requireAccount = useCallback(() => {
    if (locked) throw new Error("Log in or create an account to add or import holdings");
  }, [locked]);

  // SWR key uses primitives only — object in key or unstable snapshot → revalidate / #185 loop.
  const { data, error, isLoading, mutate } = useSWR<PortfolioAnalysis>(
    ready
      ? ([
          "/api/portfolio/analysis",
          holdingsRaw,
          isGuest,
          localSettings.benchmark,
          localSettings.name,
        ] as const)
      : null,
    fetchPortfolioAnalysis,
    { refreshInterval: refreshMs },
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
    async (benchmark: BenchmarkId, name?: string) => {
      const next: PortfolioSettings = {
        ...getLocalSettings(),
        benchmark,
        name: name ?? getLocalSettings().name,
        baseCurrency: "INR",
      };
      setLocalSettings(next);
      try {
        const res = await fetch("/api/portfolio/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ benchmark, name: next.name }),
        });
        if (!res.ok) throw new Error("Failed to update settings");
      } catch (e) {
        console.warn("Benchmark saved locally; server sync skipped:", e);
      }
      await reload();
    },
    [reload],
  );

  return {
    locked,
    holdings: localHoldings ?? [],
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
