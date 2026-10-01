/** Shared pricing copy for /pricing and marketing homepage (keep in sync). */

export const MARKETING_PLANS = [
  {
    id: "day_pass",
    name: "Day Pass",
    price: "₹9",
    interval: ", one time",
    worksOut: null as string | null,
    description: "Full access for 24 hours. No automatic renewal.",
    cta: "Get Day Pass",
  },
  {
    id: "pro_monthly",
    name: "Monthly",
    price: "₹199",
    interval: " per month",
    worksOut: "About ₹7 a day",
    description: "Full access. Cancel anytime.",
    cta: "Subscribe monthly",
  },
  {
    id: "pro_annual",
    name: "Yearly",
    price: "₹1,499",
    interval: " per year",
    worksOut: "About ₹4 a day",
    description: "Everything, plus three exclusive features. Cancel anytime.",
    cta: "Subscribe yearly",
  },
] as const;

export const MARKETING_PLAN_SAVINGS =
  "Paying monthly for a year costs ₹2,388. The yearly plan saves ₹889, or about 37%.";

export const MARKETING_FREE_TIER =
  "Free accounts get the full product with two limits: 5 AI Desk and Options Flow analyses per month (shared counter), and preview-only Company & Concall Intel, Search-trend intelligence, and Legal & insolvency.";

export const MARKETING_COMPARE_ROWS: {
  feature: string;
  mi: string;
  tickertape: string;
  screener: string;
}[] = [
  { feature: "Trial", mi: "₹9 day pass, full access", tickertape: "14-day free trial", screener: "Free tier, limited" },
  { feature: "Monthly", mi: "₹199", tickertape: "₹249", screener: "—" },
  { feature: "Yearly", mi: "₹1,499", tickertape: "₹2,399", screener: "₹4,999" },
  { feature: "AI research summaries and sentiment", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Pre-market morning briefing", mi: "Yes (Yearly)", tickertape: "—", screener: "—" },
  { feature: "Concall tone tracking", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Daily brief in Hindi", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Instant Telegram alerts", mi: "Yes", tickertape: "—", screener: "—" },
];
