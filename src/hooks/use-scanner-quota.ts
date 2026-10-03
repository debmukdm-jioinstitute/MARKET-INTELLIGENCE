"use client";

import { useAuth } from "@/components/providers/auth-provider";
import useSWR from "swr";
import type { ScannerQuotaView } from "@/lib/payments/scanner-quota";

type BillingPayload = {
  scannerScans: ScannerQuotaView | null;
};

async function loadBilling(): Promise<BillingPayload> {
  const res = await fetch("/api/billing/status");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<BillingPayload>;
}

export function useScannerQuota() {
  const { user } = useAuth();
  const signedIn = Boolean(user && !user.guest);
  const { data, error, isLoading, mutate } = useSWR(signedIn ? "/api/billing/status" : null, loadBilling);

  const quota = data?.scannerScans ?? null;
  const blocked = Boolean(quota && !quota.unlimited && quota.remaining <= 0);

  return {
    signedIn,
    quota,
    blocked,
    isLoading: signedIn && isLoading,
    error,
    refreshQuota: mutate,
  };
}
