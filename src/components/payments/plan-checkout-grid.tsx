"use client";

import { RazorpayCheckoutButton } from "@/components/payments/razorpay-checkout-button";
import { RazorpayCheckoutProvider } from "@/components/payments/razorpay-checkout-provider";
import type { RazorpayPlanId } from "@/lib/payments/plans";
import Link from "next/link";

export type PlanCheckoutItem = {
  id: RazorpayPlanId;
  name: string;
  description: string;
  displayAmount: string;
  intervalLabel: string;
  worksOutLabel?: string;
};

function checkoutLabel(planId: RazorpayPlanId): string {
  if (planId === "day_pass") return "Get Day Pass";
  if (planId === "pro_annual") return "Subscribe yearly";
  return "Subscribe monthly";
}

export function PlanCheckoutGrid({
  plans,
  keyId,
  signedIn,
  onVerified,
  yearlySavingsNote,
  compact,
}: {
  plans: PlanCheckoutItem[];
  keyId: string;
  signedIn: boolean;
  onVerified?: () => void;
  yearlySavingsNote?: string;
  compact?: boolean;
}) {
  return (
    <RazorpayCheckoutProvider>
      <div className="space-y-4">
        <div className={compact ? "grid gap-3 sm:grid-cols-3" : "grid gap-4 md:grid-cols-3"}>
          {plans.map((plan) => (
            <article key={plan.id} className="bento-stat-tile flex flex-col justify-between gap-4 p-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {plan.displayAmount}
                  <span className="text-sm font-normal text-muted-foreground">{plan.intervalLabel}</span>
                </p>
                {plan.worksOutLabel ? (
                  <p className="mt-1 text-xs font-medium text-primary">{plan.worksOutLabel}</p>
                ) : null}
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
                <RazorpayCheckoutButton
                  planId={plan.id}
                  keyId={keyId}
                  label={checkoutLabel(plan.id)}
                  onVerified={onVerified}
                />
              )}
            </article>
          ))}
        </div>
        {yearlySavingsNote ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{yearlySavingsNote}</p>
        ) : null}
      </div>
    </RazorpayCheckoutProvider>
  );
}
