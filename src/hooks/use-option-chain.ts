"use client";

import type { OptionChainSnapshot } from "@/lib/feeds/derivatives/types";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

/** Fetches available expiries for an underlying, auto-selecting the nearest one. */
export function useOptionExpiries(underlyingKey: string) {
  const [expiry, setExpiry] = useState<string>("");

  const url = underlyingKey ? `/api/feeds/upstox/option-expiries?underlying=${encodeURIComponent(underlyingKey)}` : null;
  const { data, error, isLoading } = useSWR<{ expiries: string[] }>(url, fetcher);

  const expiries = useMemo(() => data?.expiries ?? [], [data?.expiries]);

  useEffect(() => {
    if (expiries.length > 0 && !expiries.includes(expiry)) {
      setExpiry(expiries[0] ?? "");
    }
  }, [expiries, expiry]);

  return { 
    expiries, 
    expiry, 
    setExpiry, 
    loading: isLoading && !data, 
    error: error instanceof Error ? error.message : error ? String(error) : null 
  };
}

/** Polls the option chain for one underlying/expiry — Greeks/OI move faster than macro data but not tick-fast. */
export function useOptionChain(underlyingKey: string, expiry: string, refreshMs = 18_000) {
  const url = underlyingKey && expiry ? `/api/feeds/upstox/option-chain?underlying=${encodeURIComponent(underlyingKey)}&expiry=${expiry}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<OptionChainSnapshot>(url, fetcher, {
    refreshInterval: refreshMs,
  });

  return { 
    data: data ?? null, 
    loading: isLoading && !data, 
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => mutate() 
  };
}
