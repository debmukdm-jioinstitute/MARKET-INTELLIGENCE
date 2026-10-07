"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVT = "mi-board-watch";

type Cache = { raw: string; ids: readonly string[] };
const cache = new Map<string, Cache>();
const EMPTY: readonly string[] = [];

function readRaw(key: string): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function snapshot(key: string): readonly string[] {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.ids;
  const ids = parseIds(raw);
  cache.set(key, { raw, ids });
  return ids;
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(EVT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(EVT, onStoreChange);
  };
}

export function useBoardWatchlist(storageKey: string) {
  const ids = useSyncExternalStore(
    subscribe,
    () => snapshot(storageKey),
    () => EMPTY,
  );

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      const next = snapshot(storageKey).includes(id)
        ? snapshot(storageKey).filter((x) => x !== id)
        : [...snapshot(storageKey), id];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      cache.delete(storageKey);
      emit();
    },
    [storageKey],
  );

  return { ids, has, toggle };
}
