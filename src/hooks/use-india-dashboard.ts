"use client";

import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { useCallback, useEffect, useState } from "react";

export function useIndiaDashboard(refreshMs = 55_000) {
  const [data, setData] = useState<IndiaDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mergeQuick = useCallback((quick: Partial<IndiaDashboardPayload> & { fetchedAt: string }) => {
    setData((prev) => ({
      ...(prev ?? emptyShell()),
      ...quick,
      fetchedAt: quick.fetchedAt,
      pulse: quick.pulse ?? prev?.pulse ?? emptyShell().pulse,
      globalRadar: quick.globalRadar ?? prev?.globalRadar ?? emptyShell().globalRadar,
      indiaImpact: quick.indiaImpact ?? prev?.indiaImpact ?? emptyShell().indiaImpact,
    }));
  }, []);

  const reload = useCallback(async () => {
    try {
      const quickRes = await fetch("/api/feeds/india-dashboard?quick=1", { cache: "no-store" });
      if (quickRes.ok) {
        const quick = (await quickRes.json()) as Partial<IndiaDashboardPayload> & { fetchedAt: string };
        mergeQuick(quick);
        setLoading(false);
      }
      const res = await fetch("/api/feeds/india-dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as IndiaDashboardPayload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [mergeQuick]);

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  return { data, loading, error, reload };
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
