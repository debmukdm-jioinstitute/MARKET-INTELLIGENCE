"use client";

import { SEED_PORTFOLIOS } from "@/lib/portfolios";
import { getPrice } from "@/lib/market";
import { registerCustomInstrument } from "@/lib/universe";
import type { VirtualPortfolio } from "@/lib/types";
import type { Holding as UserHolding } from "@/lib/my-portfolio/types";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Store = {
  portfolios: VirtualPortfolio[];
  activeId: string;
  setActiveId: (id: string) => void;
  active: VirtualPortfolio;
  trade: (symbol: string, side: "BUY" | "SELL", notional: number) => void;
};

const Ctx = createContext<Store | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolios, setPortfolios] = useState(SEED_PORTFOLIOS);
  const [activeId, setActiveId] = useState(SEED_PORTFOLIOS[0]!.id);

  // Synchronize active portfolio holdings with unified user storage
  useEffect(() => {
    function syncHoldings() {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem("mi_user_holdings_v2");
        if (raw) {
          const list = JSON.parse(raw) as UserHolding[];
          if (Array.isArray(list) && list.length > 0) {
            for (const item of list) {
              registerCustomInstrument(item);
            }
            setPortfolios((prev) =>
              prev.map((p) => {
                if (p.id === activeId || p.id === "flagship") {
                  return {
                    ...p,
                    holdings: list.map((h) => ({
                      symbol: h.symbol,
                      shares: h.shares,
                      avgCost: h.avgCost,
                    })),
                  };
                }
                return p;
              }),
            );
          }
        }
      } catch (e) {
        console.warn("Portfolio provider sync error:", e);
      }
    }
    syncHoldings();
    window.addEventListener("mi_portfolio_updated", syncHoldings);
    return () => window.removeEventListener("mi_portfolio_updated", syncHoldings);
  }, [activeId]);
  const active = useMemo(
    () => portfolios.find((p) => p.id === activeId) ?? portfolios[0]!,
    [portfolios, activeId],
  );

  function trade(symbol: string, side: "BUY" | "SELL", notional: number) {
    const px = getPrice(symbol);
    const shares = notional / px;
    setPortfolios((prev) =>
      prev.map((p) => {
        if (p.id !== active.id) return p;
        const existing = p.holdings.find((h) => h.symbol === symbol);
        let holdings = [...p.holdings];
        let cash = p.cash;
        if (side === "BUY") {
          cash -= notional;
          if (existing) {
            const newShares = existing.shares + shares;
            const avgCost = (existing.avgCost * existing.shares + notional) / newShares;
            holdings = holdings.map((h) => (h.symbol === symbol ? { ...h, shares: newShares, avgCost } : h));
          } else {
            holdings.push({ symbol, shares, avgCost: px });
          }
        } else {
          if (!existing) return p;
          const sellShares = Math.min(existing.shares, shares);
          cash += sellShares * px;
          const remaining = existing.shares - sellShares;
          holdings =
            remaining <= 0.0001
              ? holdings.filter((h) => h.symbol !== symbol)
              : holdings.map((h) => (h.symbol === symbol ? { ...h, shares: remaining } : h));
        }
        return {
          ...p,
          cash,
          holdings,
          trades: [
            ...p.trades,
            {
              id: `${p.id}-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              symbol,
              side,
              shares,
              price: px,
              notional,
            },
          ],
        };
      }),
    );
  }

  return (
    <Ctx.Provider value={{ portfolios, activeId, setActiveId, active, trade }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
