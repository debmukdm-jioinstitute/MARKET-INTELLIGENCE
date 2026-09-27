"use client";

import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { useCallback, useRef, useState } from "react";
import useSWR, { type MutatorCallback, useSWRConfig } from "swr";

type DashboardMutate = (
  key: string,
  data?: IndiaDashboardPayload | MutatorCallback<IndiaDashboardPayload> | undefined,
  opts?: { revalidate?: boolean },
) => void;

/** Module-level loader — never define `const fetcher = async` inside a hook body (SWR #185). */
async function loadIndiaDashboard(url: string, mutate: DashboardMutate, onFirstFull: () => void): Promise<IndiaDashboardPayload> {
  const quickRes = await fetch(`${url}?quick=1`, { cache: "no-store" });
  if (quickRes.ok) {
    const quick = (await quickRes.json()) as Partial<IndiaDashboardPayload> & { fetchedAt: string };

    mutate(
      url,
      (prev: IndiaDashboardPayload | undefined) => {
        const base = prev ?? emptyShell();
        const q = quick as Partial<IndiaDashboardPayload> & {
          rbiLiquidity?: Partial<IndiaDashboardPayload["rbiLiquidity"]>;
        };
        return {
          ...base,
          fetchedAt: q.fetchedAt ?? base.fetchedAt,
          pulse: q.pulse ?? base.pulse,
          globalRadar: q.globalRadar ?? base.globalRadar,
          indiaImpact: q.indiaImpact ?? base.indiaImpact,
          moneyFlow: q.moneyFlow ?? base.moneyFlow,
          rbiLiquidity: q.rbiLiquidity
            ? {
                ...base.rbiLiquidity,
                ...q.rbiLiquidity,
                systemLiquidity: q.rbiLiquidity.systemLiquidity ?? base.rbiLiquidity.systemLiquidity,
                corridor: base.rbiLiquidity.corridor,
                rows: base.rbiLiquidity.rows,
                fxReserves: base.rbiLiquidity.fxReserves,
              }
            : base.rbiLiquidity,
        };
      },
      { revalidate: false },
    );
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const full = (await res.json()) as IndiaDashboardPayload;
  onFirstFull();
  return full;
}

export function useIndiaDashboard(refreshMs = 55_000) {
  const { mutate } = useSWRConfig();
  const [loadingFull, setLoadingFull] = useState(true);
  const fullLoadedRef = useRef(false);

  const fetcher = useCallback(
    (url: string) =>
      loadIndiaDashboard(url, mutate as DashboardMutate, () => {
        if (fullLoadedRef.current) return;
        fullLoadedRef.current = true;
        setLoadingFull(false);
      }),
    [mutate],
  );

  const { data, error, isLoading, mutate: reloadMutate } = useSWR<IndiaDashboardPayload>(
    "/api/feeds/india-dashboard",
    fetcher,
    { refreshInterval: refreshMs },
  );

  return {
    data: data ?? null,
    loading: isLoading && !data,
    loadingFull: loadingFull && !data,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: () => reloadMutate(),
  };
}

function emptyShell(): IndiaDashboardPayload {
  const na = { value: null, source: { provider: "—", url: "#" } };
  return {
    fetchedAt: new Date().toISOString(),
    pulse: {
      nifty: na,
      sensex: na,
      bankNifty: na,
      indiaVix: na,
      usdInr: na,
      gsec10y: na,
      brent: na,
      gold: na,
      breadth: {
        advances: null,
        declines: null,
        unchanged: null,
        high52w: null,
        low52w: null,
        source: { provider: "NSE India", url: "https://www.nseindia.com/" },
      },
    },
    indiaMoving: {
      nifty: { symbol: "^NSEI", name: "NIFTY", current: na, history1m: [] },
      bankNifty: { symbol: "^NSEBANK", name: "BANK NIFTY", current: na, history1m: [] },
      indiaVix: { symbol: "^INDIAVIX", name: "VIX", current: na, history1m: [] },
      breadth: {
        advances: null,
        declines: null,
        unchanged: null,
        high52w: null,
        low52w: null,
        source: { provider: "NSE India", url: "https://www.nseindia.com/" },
      },
      fo: {
        nifty: {
          symbol: "NIFTY",
          pcr: null,
          totalOi: null,
          changeOi: null,
          callOi: null,
          putOi: null,
          maxPain: null,
          topCallStrikes: [],
          topPutStrikes: [],
          source: { provider: "NSE India", url: "https://www.nseindia.com/" },
        },
        bankNifty: {
          symbol: "BANKNIFTY",
          pcr: null,
          totalOi: null,
          changeOi: null,
          callOi: null,
          putOi: null,
          maxPain: null,
          topCallStrikes: [],
          topPutStrikes: [],
          source: { provider: "NSE India", url: "https://www.nseindia.com/" },
        },
      },
    },
    globalRadar: {
      sp500: na,
      nasdaq: na,
      dow: na,
      us10y: na,
      dxy: na,
      vix: na,
      brent: na,
      gold: na,
      copper: na,
      usdInr: na,
    },
    indiaImpact: { label: "neutral", score: 0, drivers: [], methodology: "" },
    indiaMacro: [],
    rbiLiquidity: {
      rows: [],
      systemLiquidity: {
        value: null,
        change7d: null,
        trend30d: [],
        source: { provider: "RBI", url: "https://www.rbi.org.in/" },
      },
    },
    moneyFlow: {
      fii: { label: "FII", today: null, d5: null, m1: null, ytd: null, source: { provider: "NSE", url: "#" } },
      dii: { label: "DII", today: null, d5: null, m1: null, ytd: null, source: { provider: "NSE", url: "#" } },
      fiiVsDii: { fii: null, dii: null, source: { provider: "NSE", url: "#" } },
      extras: [],
    },
  };
}
