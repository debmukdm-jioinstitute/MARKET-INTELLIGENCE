"use client";

import { useAuth } from "@/components/providers/auth-provider";
import useSWR from "swr";

export type AiAnalysisQuota = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  periodLabel: string;
};

type BillingPayload = {
  isPro: boolean;
  aiAnalyses: AiAnalysisQuota | null;
};

async function loadBilling(): Promise<BillingPayload> {
  const res = await fetch("/api/billing/status");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<BillingPayload>;
}

export function useAiAnalysisQuota() {
  const { user } = useAuth();
  const signedIn = Boolean(user && !user.guest);
  const { data, error, isLoading, mutate } = useSWR(signedIn ? "/api/billing/status" : null, loadBilling);

  const quota = data?.aiAnalyses ?? null;
  const blocked = Boolean(quota && !quota.unlimited && quota.remaining <= 0);

  return {
    signedIn,
    isPro: Boolean(data?.isPro),
    quota,
    blocked,
    isLoading: signedIn && isLoading,
    error,
    refreshQuota: mutate,
  };
}
