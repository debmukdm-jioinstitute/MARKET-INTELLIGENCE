export const PAID_PLAN_IDS = ["day_pass", "pro_monthly", "pro_annual"] as const;
export type RazorpayPlanId = (typeof PAID_PLAN_IDS)[number];

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
      name: "Day Pass",
      description: "Full access for 24 hours. No automatic renewal.",
      amountPaise: envPaise("RAZORPAY_DAY_PASS_PAISE", 9_00),
      currency: "INR",
      intervalLabel: ", one time",
    },
    {
      id: "pro_monthly",
      name: "Monthly",
      description: "Full access. Cancel anytime.",
      amountPaise: envPaise("RAZORPAY_PRO_MONTHLY_PAISE", 199_00),
      currency: "INR",
      intervalLabel: " per month",
      worksOutLabel: "About ₹7 a day",
    },
    {
      id: "pro_annual",
      name: "Yearly",
      description: "Everything, plus three exclusive features. Cancel anytime.",
      amountPaise: envPaise("RAZORPAY_PRO_ANNUAL_PAISE", 1_499_00),
      currency: "INR",
      intervalLabel: " per year",
      worksOutLabel: "About ₹4 a day",
    },
  ];
}

export function getRazorpayPlan(planId: string): RazorpayPlan | null {
  return getRazorpayPlans().find((p) => p.id === planId) ?? null;
}

export function formatInrFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Marketing copy for yearly savings vs 12× monthly (₹199). */
export function yearlySavingsCopy(): string {
  const monthly = getRazorpayPlans().find((p) => p.id === "pro_monthly")!.amountPaise;
  const yearly = getRazorpayPlans().find((p) => p.id === "pro_annual")!.amountPaise;
  const twelveMonthly = monthly * 12;
  const save = twelveMonthly - yearly;
  const pct = Math.round((save / twelveMonthly) * 100);
  return `Paying monthly for a year costs ${formatInrFromPaise(twelveMonthly)}. The yearly plan saves ${formatInrFromPaise(save)}, or about ${pct}%.`;
}
