export type RazorpayPlanId = "pro_monthly" | "pro_annual";

export type RazorpayPlan = {
  id: RazorpayPlanId;
  name: string;
  description: string;
  amountPaise: number;
  currency: "INR";
  intervalLabel: string;
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
      id: "pro_monthly",
      name: "Pro Monthly",
      description: "Full terminal access, alerts, and AI desk — billed monthly.",
      amountPaise: envPaise("RAZORPAY_PRO_MONTHLY_PAISE", 499_00),
      currency: "INR",
      intervalLabel: "/ month",
    },
    {
      id: "pro_annual",
      name: "Pro Annual",
      description: "Same Pro features — save vs monthly when paid yearly.",
      amountPaise: envPaise("RAZORPAY_PRO_ANNUAL_PAISE", 4_999_00),
      currency: "INR",
      intervalLabel: "/ year",
    },
  ];
}

export function getRazorpayPlan(planId: string): RazorpayPlan | null {
  return getRazorpayPlans().find((p) => p.id === planId) ?? null;
}

export function formatInrFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
