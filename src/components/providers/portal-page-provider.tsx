"use client";

import type { PortalPageControlRow } from "@/lib/portal-page-access";
import { resolvePortalPathAccess, isPortalHrefAllowed } from "@/lib/portal-page-access";
import { DEFAULT_LOCK_MESSAGE } from "@/lib/portal-page-registry";
import { useAuth } from "@/components/providers/auth-provider";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import useSWR from "swr";

type PortalPagesCtx = {
  controls: PortalPageControlRow[];
  configured: boolean;
  defaultLockMessage: string;
  loading: boolean;
  refresh: () => void;
  accessForPath: (pathname: string) => ReturnType<typeof resolvePortalPathAccess>;
  hrefAllowed: (href: string) => boolean;
  bypass: boolean;
};

const Ctx = createContext<PortalPagesCtx | null>(null);

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as { controls: PortalPageControlRow[]; configured?: boolean; defaultLockMessage?: string };
};

export function PortalPageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const bypass = user?.role === "admin";
  const { data, isLoading, mutate } = useSWR("/api/portal/pages", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const controls = useMemo(() => data?.controls ?? [], [data?.controls]);
  const configured = data?.configured ?? false;
  const defaultLockMessage = data?.defaultLockMessage ?? DEFAULT_LOCK_MESSAGE;

  const accessForPath = useCallback(
    (pathname: string) => resolvePortalPathAccess(pathname, controls),
    [controls],
  );

  const hrefAllowed = useCallback(
    (href: string) => isPortalHrefAllowed(href, controls, bypass),
    [controls, bypass],
  );

  const value = useMemo<PortalPagesCtx>(
    () => ({
      controls,
      configured,
      defaultLockMessage,
      loading: isLoading && !data,
      refresh: () => mutate(),
      accessForPath,
      hrefAllowed,
      bypass,
    }),
    [controls, configured, defaultLockMessage, isLoading, data, mutate, accessForPath, hrefAllowed, bypass],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortalPages() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      controls: [] as PortalPageControlRow[],
      configured: false,
      defaultLockMessage: DEFAULT_LOCK_MESSAGE,
      loading: false,
      refresh: () => {},
      accessForPath: (pathname: string) => resolvePortalPathAccess(pathname, []),
      hrefAllowed: () => true,
      bypass: false,
    };
  }
  return ctx;
}
