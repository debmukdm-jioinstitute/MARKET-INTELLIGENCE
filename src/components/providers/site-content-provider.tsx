"use client";

import { MI_CONTENT_SAVED, MI_DRAFT_OVERRIDES, MI_EDIT_QUERY } from "@/lib/site-content";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";

type SiteContentCtx = {
  overrides: Record<string, string>;
  loading: boolean;
  text: (slotKey: string, fallback: string) => string;
  refresh: () => void;
};

const Ctx = createContext<SiteContentCtx | null>(null);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const editMode = searchParams.get(MI_EDIT_QUERY) === "1";
  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>({});

  const { data, isLoading, mutate } = useSWR<{ overrides: Record<string, string> }>(
    "/api/portal/content",
    fetcher,
    { refreshInterval: 120_000, revalidateOnFocus: true },
  );

  const saved = data?.overrides ?? {};
  const overrides = useMemo(
    () => (editMode ? { ...saved, ...draftOverrides } : saved),
    [editMode, saved, draftOverrides],
  );

  useEffect(() => {
    if (!editMode) setDraftOverrides({});
  }, [editMode]);

  useEffect(() => {
    function refresh() {
      void mutate();
      setDraftOverrides({});
    }
    function onMessage(ev: MessageEvent) {
      if (ev.data?.type === MI_CONTENT_SAVED) refresh();
      if (editMode && ev.data?.type === MI_DRAFT_OVERRIDES && ev.data.overrides) {
        setDraftOverrides(ev.data.overrides as Record<string, string>);
      }
    }
    window.addEventListener("message", onMessage);
    window.addEventListener(MI_CONTENT_SAVED, refresh);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener(MI_CONTENT_SAVED, refresh);
    };
  }, [mutate, editMode]);

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
