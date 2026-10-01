"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RazorpayCheckoutButton } from "@/components/payments/razorpay-checkout-button";
import { useAuth } from "@/components/providers/auth-provider";
import type { RazorpayPlanId } from "@/lib/payments/plans";
import Link from "next/link";
import useSWR from "swr";

type ConfigResponse = {
  enabled: boolean;
  keyId: string | null;
  plans: {
    id: RazorpayPlanId;
    name: string;
    description: string;
    displayAmount: string;
    intervalLabel: string;
  }[];
};

async function loadConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/payments/razorpay/config");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ConfigResponse>;
}

export default function PricingPage() {
  const { user } = useAuth();
  const { data, error, isLoading } = useSWR("/api/payments/razorpay/config", loadConfig);
  const signedIn = Boolean(user && !user.guest);

  return (
    <div className="portal-page max-w-4xl space-y-8">
      <PageHeader
        kicker="Billing"
        title="Pro plans"
        subtitle="Razorpay Standard Checkout — secure UPI, cards, and netbanking. Orders are created server-side; payments are signature-verified before confirmation."
        trust={{
          source: "Razorpay Payment Gateway",
          methodology: "Integration follows Razorpay Standard Checkout: create order → checkout.js → server-side HMAC verify.",
        }}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : error ? (
        <p className="text-sm text-rose-600">Could not load billing config.</p>
      ) : !data?.enabled || !data.keyId ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Razorpay keys not set on this environment. Add{" "}
          <span className="font-medium text-foreground">NEXT_PUBLIC_RAZORPAY_KEY_ID</span> and{" "}
          <span className="font-medium text-foreground">RAZORPAY_KEY_SECRET</span> in Vercel, then redeploy.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.plans.map((plan) => (
            <article key={plan.id} className="bento-stat-tile flex flex-col justify-between gap-4 p-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {plan.displayAmount}
                  <span className="text-sm font-normal text-muted-foreground">{plan.intervalLabel}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
              </div>
              {!signedIn ? (
                <p className="text-sm text-muted-foreground">
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to checkout.
                </p>
              ) : (
                <RazorpayCheckoutButton planId={plan.id} keyId={data.keyId} label={`Pay with Razorpay`} />
              )}
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Docs:{" "}
        <a
          href="https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Razorpay Standard integration steps
        </a>
        . Test mode uses Dashboard test keys; live keys only after KYC activation.
      </p>
    </div>
  );
}
