"use client";

import { prefetchIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useSWRConfig } from "swr";
import { useEffect } from "react";

/** Prefetch india dashboard as soon as portal shell mounts. */
export function IndiaDashboardWarmup() {
  const { mutate } = useSWRConfig();
  useEffect(() => {
    void prefetchIndiaDashboard(mutate);
    void fetch("/api/homedashboard/headlines", { cache: "no-store" }).catch(() => {});
  }, [mutate]);
  return null;
}
