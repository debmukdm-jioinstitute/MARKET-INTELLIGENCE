"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PlanCheckoutGrid } from "@/components/payments/plan-checkout-grid";
import { useAuth } from "@/components/providers/auth-provider";
import {
  MARKETING_COMPARE_ROWS,
  MARKETING_FREE_TIER,
  PRICING_PLAN_BULLETS,
} from "@/lib/marketing/pricing-marketing";
import { parseActivePlanId, type RazorpayPlanId } from "@/lib/payments/plans";
import Link from "next/link";
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

async function loadConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/payments/razorpay/config");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ConfigResponse>;
}

type BillingStatus = {
  isPro: boolean;
  pro: { active: boolean; planId: string | null; expiresAt: string | null };
};

export default function PricingPage() {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useSWR("/api/payments/razorpay/config", loadConfig);
  const signedIn = Boolean(user && !user.guest);
  const checkoutKeyId = data?.enabled && data.keyId != null ? data.keyId : null;
  const { data: billing, mutate: refreshBilling } = useSWR<BillingStatus>(
    signedIn ? "/api/billing/status" : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<BillingStatus>;
    },
  );

  const activePlanId =
    billing?.isPro && billing.pro.active ? parseActivePlanId(billing.pro.planId) : null;

  const pricingDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="portal-page max-w-5xl space-y-10">
      <PageHeader
        kicker="Pricing plan"
        title="Market Intelligence"
        subtitle={`getmarketintelligence.in · ${pricingDate}. All prices are in INR and include all taxes.`}
      />

      {billing?.isPro ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          Full access active
          {billing.pro.expiresAt
            ? ` until ${new Date(billing.pro.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : ""}
          .
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">The three plans</h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        ) : error ? (
          <p className="text-sm text-rose-600">Could not load billing config.</p>
        ) : checkoutKeyId && data ? (
          <>
            <PlanCheckoutGrid
              plans={data.plans}
              keyId={checkoutKeyId}
              signedIn={signedIn}
              activePlanId={activePlanId}
              yearlySavingsNote={data.yearlySavingsNote}
              onVerified={() => {
                void mutate();
                void refreshBilling();
              }}
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Razorpay keys not set on this environment. Add{" "}
            <span className="font-medium text-foreground">NEXT_PUBLIC_RAZORPAY_KEY_ID</span> and{" "}
            <span className="font-medium text-foreground">RAZORPAY_KEY_SECRET</span> in Vercel, then redeploy.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">What each plan includes</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{MARKETING_FREE_TIER}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["free", "day_pass", "pro_monthly", "pro_annual"] as const).map((tier) => (
            <div key={tier} className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="text-sm font-bold text-foreground">
                {tier === "free"
                  ? "Free"
                  : tier === "day_pass"
                    ? "Daily pass"
                    : tier === "pro_monthly"
                      ? "Plus"
                      : "Pro"}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {PRICING_PLAN_BULLETS[tier].map((line) => (
                  <li key={line} className="leading-snug">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">How we compare</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 font-semibold text-foreground" scope="col" />
                <th className="px-4 py-3 font-semibold text-foreground" scope="col">
                  Market Intelligence
                </th>
                <th className="px-4 py-3 font-semibold text-muted-foreground" scope="col">
                  Tickertape Pro
                </th>
                <th className="px-4 py-3 font-semibold text-muted-foreground" scope="col">
                  Screener
                </th>
              </tr>
            </thead>
            <tbody>
              {MARKETING_COMPARE_ROWS.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-0">
                  <th className="px-4 py-2.5 font-medium text-foreground" scope="row">
                    {row.feature}
                  </th>
                  <td className="px-4 py-2.5 text-foreground">{row.mi}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.tickertape}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.screener}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Checkout via Razorpay (UPI, cards, netbanking). Orders created server-side; payments verified with HMAC before
        access is granted.
      </p>
    </div>
  );
}
