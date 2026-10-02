"use client";

import { PlanCheckoutGrid } from "@/components/payments/plan-checkout-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { MARKETING_FREE_TIER } from "@/lib/marketing/pricing-marketing";
import { parseActivePlanId, type RazorpayPlanId } from "@/lib/payments/plans";
import useSWR from "swr";

type ConfigResponse = {
  enabled: boolean;
  keyId: string | null;
  yearlySavingsNote?: string;
  plans: {
    id: RazorpayPlanId;
    name: string;
    description: string;
    displayAmount: string;
    intervalLabel: string;
    worksOutLabel?: string;
  }[];
};

type BillingStatus = {
  isPro: boolean;
  pro: { active: boolean; planId: string | null; expiresAt: string | null };
};

async function loadConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/payments/razorpay/config");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ConfigResponse>;
}

async function loadBilling(): Promise<BillingStatus> {
  const res = await fetch("/api/billing/status");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<BillingStatus>;
}

export function ProfilePlanBilling({ onUpgraded }: { onUpgraded?: () => void }) {
  const { user } = useAuth();
  const signedIn = Boolean(user && !user.guest);
  const { data: config, error: configError, isLoading: configLoading, mutate: refreshConfig } = useSWR(
    "/api/payments/razorpay/config",
    loadConfig,
  );
  const { data: billing, mutate: refreshBilling } = useSWR(signedIn ? "/api/billing/status" : null, loadBilling);

  const checkoutKeyId = config?.enabled && config.keyId != null ? config.keyId : null;
  const activePlanId =
    billing?.isPro && billing.pro.active ? parseActivePlanId(billing.pro.planId) : null;

  return (
    <div className="space-y-4">
      {billing?.isPro ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          Full access active
          {billing.pro.expiresAt
            ? ` until ${new Date(billing.pro.expiresAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`
            : ""}
          . You can extend with another plan below.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">{MARKETING_FREE_TIER}</p>
      )}

      {configLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : configError || !checkoutKeyId || !config ? (
        <p className="text-sm text-muted-foreground">Checkout unavailable right now. Try again later or visit /pricing.</p>
      ) : (
        <PlanCheckoutGrid
          compact
          plans={config.plans}
          keyId={checkoutKeyId}
          signedIn={signedIn}
          activePlanId={activePlanId}
          yearlySavingsNote={config.yearlySavingsNote}
          onVerified={() => {
            void refreshConfig();
            void refreshBilling();
            onUpgraded?.();
          }}
        />
      )}
    </div>
  );
}
