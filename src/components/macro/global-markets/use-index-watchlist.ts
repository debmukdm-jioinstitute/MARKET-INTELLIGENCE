"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mi_indices_watchlist_v1";

export function useIndexWatchlist() {
  const { ready, isGuest } = useAuth();
  const accountWatchlist = useWatchlist();
  const [localWatchlist, setLocalWatchlist] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate local storage safely on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLocalWatchlist(new Set(parsed));
        }
      }
    } catch {
      // Storage unavailable or blocked (private browsing mode)
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage whenever localWatchlist changes after hydration
  const persistLocal = useCallback((items: Set<string>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items)));
    } catch {
      // Storage quota or unavailable
    }
  }, []);

  const isAccountBacked = ready && !isGuest && !accountWatchlist.locked;

  // Account items symbol map memoized
  const accountSymbols = useMemo(() => {
    return new Set(accountWatchlist.items.map((i) => i.symbol.toUpperCase()));
  }, [accountWatchlist.items]);

  const isWatchlisted = useCallback(
    (id: string, symbol?: string) => {
      if (!isHydrated) return false;
      const cleanSym = symbol?.toUpperCase();
      if (isAccountBacked && cleanSym && accountSymbols.has(cleanSym)) {
        return true;
      }
      return localWatchlist.has(id) || (cleanSym ? localWatchlist.has(cleanSym) : false);
    },
    [accountSymbols, isAccountBacked, isHydrated, localWatchlist],
  );

  const toggle = useCallback(
    async (id: string, symbol?: string, label?: string) => {
      const currentlyWatchlisted = isWatchlisted(id, symbol);
      const next = new Set(localWatchlist);

      if (currentlyWatchlisted) {
        next.delete(id);
        if (symbol) next.delete(symbol.toUpperCase());
        setLocalWatchlist(next);
        persistLocal(next);

        if (isAccountBacked && symbol) {
          const matchedItem = accountWatchlist.items.find(
            (i) => i.symbol.toUpperCase() === symbol.toUpperCase(),
          );
          if (matchedItem) {
            try {
              await accountWatchlist.remove(matchedItem.id);
            } catch {
              // Ignore failure, local state remains updated
            }
          }
        }
      } else {
        next.add(id);
        if (symbol) next.add(symbol.toUpperCase());
        setLocalWatchlist(next);
        persistLocal(next);

        if (isAccountBacked && symbol) {
          try {
            await accountWatchlist.add({
              market: "US",
              symbol: symbol,
              name: label || id,
            });
          } catch {
            // Ignore failure, local state remains updated
          }
        }
      }
    },
    [accountWatchlist, isAccountBacked, isWatchlisted, localWatchlist, persistLocal],
  );

  return {
    isHydrated,
    isWatchlisted,
    toggle,
    isLocal: !isAccountBacked,
    localCount: localWatchlist.size,
  };
}
