"use client";
import useSWR from "swr";
import type { ChartPayload } from "@/lib/ts-charts/types";

// Module-level loader: stable identity (AGENTS.md "React update loops").
const load = (u: string): Promise<ChartPayload> =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

export const useChartData = (id: string) => useSWR(`/api/ts/chart/${id}`, load, { revalidateOnFocus: false });
