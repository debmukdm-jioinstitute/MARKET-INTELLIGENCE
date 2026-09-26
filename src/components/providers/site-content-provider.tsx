"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";

type SiteContentCtx = {
  overrides: Record<string, string>;
  loading: boolean;
  text: (slotKey: string, fallback: string) => string;
  refresh: () => void;
};

const Ctx = createContext<SiteContentCtx | null>(null);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR<{ overrides: Record<string, string> }>(
    "/api/portal/content",
    fetcher,
    { refreshInterval: 120_000, revalidateOnFocus: true },
  );

  const overrides = data?.overrides ?? {};

  useEffect(() => {
    function refresh() {
      void mutate();
    }
    function onMessage(ev: MessageEvent) {
      if (ev.data?.type === "MI_CONTENT_SAVED") refresh();
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("MI_CONTENT_SAVED", refresh);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("MI_CONTENT_SAVED", refresh);
    };
  }, [mutate]);

  const text = useCallback(
    (slotKey: string, fallback: string) => {
      const v = overrides[slotKey];
      return v != null && v.length > 0 ? v : fallback;
    },
    [overrides],
  );

  const value = useMemo(
    () => ({ overrides, loading: isLoading && !data, text, refresh: () => mutate() }),
    [overrides, isLoading, data, text, mutate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteContent(slotKey: string, fallback: string): string {
  const ctx = useContext(Ctx);
  if (!ctx) return fallback;
  return ctx.text(slotKey, fallback);
}

export function useSiteContentActions() {
  const ctx = useContext(Ctx);
  return { refresh: ctx?.refresh ?? (() => {}) };
}
