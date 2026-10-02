export const PAID_PLAN_IDS = ["day_pass", "pro_monthly", "pro_annual"] as const;
export type RazorpayPlanId = (typeof PAID_PLAN_IDS)[number];

/** Plus plan launch: pay ₹99 once by this instant (IST) → 3 months access (1 paid + 2 free). */
export const PLUS_LAUNCH_OFFER_END_ISO = "2026-10-31T23:59:59.999+05:30";

export const PLUS_LAUNCH_OFFER_NOTE =
  "Launch offer: ₹99 for your first month. Subscribe by 31 Oct 2026 and get 2 extra months free (3 months total).";

export function plusLaunchOfferActive(at = new Date()): boolean {
  return at.getTime() <= new Date(PLUS_LAUNCH_OFFER_END_ISO).getTime();
}

export function plusPlanGrantDays(at = new Date()): number {
  return plusLaunchOfferActive(at) ? 90 : 30;
}

export function parseActivePlanId(raw: string | null | undefined): RazorpayPlanId | null {
  if (!raw) return null;
  return PAID_PLAN_IDS.includes(raw as RazorpayPlanId) ? (raw as RazorpayPlanId) : null;
}

export type RazorpayPlan = {
  id: RazorpayPlanId;
  name: string;
  description: string;
  amountPaise: number;
  currency: "INR";
  intervalLabel: string;
  /** e.g. "About ₹4 a day" */
  worksOutLabel?: string;
};

function envPaise(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Standard Checkout amounts (paise). Override via RAZORPAY_* env on Vercel. */
export function getRazorpayPlans(): RazorpayPlan[] {
  return [
    {
      id: "day_pass",
      name: "Daily pass",
      description: "Full access for 24 hours. No automatic renewal.",
      amountPaise: envPaise("RAZORPAY_DAY_PASS_PAISE", 9_00),
      currency: "INR",
      intervalLabel: ", one time",
    },
    {
      id: "pro_monthly",
      name: "Plus plan",
      description: plusLaunchOfferActive()
        ? `Full access. ${PLUS_LAUNCH_OFFER_NOTE}`
        : "Full access. Cancel anytime.",
      amountPaise: envPaise("RAZORPAY_PRO_MONTHLY_PAISE", 99_00),
      currency: "INR",
      intervalLabel: " per month",
      worksOutLabel: plusLaunchOfferActive() ? "3 months for ₹99 if you join by 31 Oct" : "About ₹3 a day",
    },
    {
      id: "pro_annual",
      name: "Pro plan",
      description: "Everything, plus three exclusive features. Cancel anytime.",
      amountPaise: envPaise("RAZORPAY_PRO_ANNUAL_PAISE", 99_900),
      currency: "INR",
      intervalLabel: " per year",
      worksOutLabel: "About ₹3 a day",
    },
  ];
}

export function getRazorpayPlan(planId: string): RazorpayPlan | null {
  return getRazorpayPlans().find((p) => p.id === planId) ?? null;
}

export function formatInrFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Marketing copy for yearly savings vs 12× Plus plan monthly price. */
export function yearlySavingsCopy(): string {
  const monthly = getRazorpayPlans().find((p) => p.id === "pro_monthly")!.amountPaise;
  const yearly = getRazorpayPlans().find((p) => p.id === "pro_annual")!.amountPaise;
  const twelveMonthly = monthly * 12;
  const save = twelveMonthly - yearly;
  const pct = Math.round((save / twelveMonthly) * 100);
  return `Paying monthly for a year costs ${formatInrFromPaise(twelveMonthly)}. The yearly plan saves ${formatInrFromPaise(save)}, or about ${pct}%.`;
}
