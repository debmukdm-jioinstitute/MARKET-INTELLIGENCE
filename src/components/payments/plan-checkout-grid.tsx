"use client";

import { RazorpayCheckoutButton } from "@/components/payments/razorpay-checkout-button";
import { RazorpayCheckoutProvider } from "@/components/payments/razorpay-checkout-provider";
import { PRICING_PLAN_BULLETS } from "@/lib/marketing/pricing-marketing";
import type { RazorpayPlanId } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type PlanCheckoutItem = {
  id: RazorpayPlanId;
  name: string;
  description: string;
  displayAmount: string;
  intervalLabel: string;
  worksOutLabel?: string;
};

function defaultCheckoutLabel(planId: RazorpayPlanId): string {
  if (planId === "day_pass") return "Choose daily pass";
  if (planId === "pro_annual") return "Choose Pro plan";
  return "Choose Plus plan";
}

function checkoutLabel(planId: RazorpayPlanId, activePlanId: RazorpayPlanId | null): string {
  if (activePlanId && planId !== activePlanId) return "Upgrade";
  return defaultCheckoutLabel(planId);
}

export function PlanCheckoutGrid({
  plans,
  keyId,
  signedIn,
  activePlanId = null,
  onVerified,
  yearlySavingsNote,
  compact,
}: {
  plans: PlanCheckoutItem[];
  keyId: string;
  signedIn: boolean;
  /** When set, that plan card is disabled as the current subscription. */
  activePlanId?: RazorpayPlanId | null;
  onVerified?: () => void;
  yearlySavingsNote?: string;
  compact?: boolean;
}) {
  const hasActivePlan = activePlanId != null;

  return (
    <RazorpayCheckoutProvider>
      <div className="space-y-4">
        <div className={compact ? "grid gap-3 sm:grid-cols-3" : "grid gap-4 md:grid-cols-3"}>
          {plans.map((plan) => {
            const isCurrent = hasActivePlan && plan.id === activePlanId;
            return (
              <article
                key={plan.id}
                className={cn(
                  "bento-stat-tile flex flex-col justify-between gap-4 p-5",
                  isCurrent && "ring-2 ring-emerald-500/40 border-emerald-500/30",
                )}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    {isCurrent ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                        Your plan
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">
                    {plan.displayAmount}
                    <span className="text-sm font-normal text-muted-foreground">{plan.intervalLabel}</span>
                  </p>
                  {plan.worksOutLabel ? (
                    <p className="mt-1 text-xs font-medium text-primary">{plan.worksOutLabel}</p>
                  ) : null}
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {PRICING_PLAN_BULLETS[plan.id].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-primary" aria-hidden>
                          ✓
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {!signedIn ? (
                  <p className="text-sm text-muted-foreground">
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                      Sign in
                    </Link>{" "}
                    to checkout.
                  </p>
                ) : isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground opacity-80"
                  >
                    Current plan
                  </button>
                ) : (
                  <RazorpayCheckoutButton
                    planId={plan.id}
                    keyId={keyId}
                    label={checkoutLabel(plan.id, activePlanId)}
                    onVerified={onVerified}
                  />
                )}
              </article>
            );
          })}
        </div>
        {yearlySavingsNote ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{yearlySavingsNote}</p>
        ) : null}
      </div>
    </RazorpayCheckoutProvider>
  );
}
