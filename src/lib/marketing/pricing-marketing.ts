/** Shared pricing copy for /pricing and marketing homepage (keep in sync with getRazorpayPlans). */

import { formatInrFromPaise, getRazorpayPlans, plusLaunchOfferActive, yearlySavingsCopy } from "@/lib/payments/plans";

const PLANS = getRazorpayPlans();

export const MARKETING_PLANS = PLANS.map((p) => ({
  id: p.id,
  name: p.name,
  price: formatInrFromPaise(p.amountPaise),
  interval: p.intervalLabel,
  worksOut: p.worksOutLabel ?? null,
  description: p.description,
  cta:
    p.id === "day_pass"
      ? "Choose daily pass"
      : p.id === "pro_monthly"
        ? "Choose Plus plan"
        : "Choose Pro plan",
}));

export const MARKETING_PLAN_SAVINGS = yearlySavingsCopy();

export const MARKETING_FREE_TIER =
  "Free accounts get the full website with two limits: 5 AI Desk and Options Flow analyses per month (shared counter), preview-only Company & Concall Intel, Search-trend intelligence, and Legal & insolvency. Claude MCP (Claude Desktop, Cursor, Claude Code) is not on Free — it is included on every paid plan.";

export const MARKETING_PAID_MCP =
  "Claude MCP connector — live market tools inside Claude Desktop, claude.ai, Cursor, and Claude Code.";

export const MARKETING_COMPARE_ROWS: {
  feature: string;
  mi: string;
  tickertape: string;
  screener: string;
}[] = [
  { feature: "Trial", mi: "₹9 daily pass, full access", tickertape: "14-day free trial", screener: "Free tier, limited" },
  { feature: "Plus (monthly)", mi: "₹99", tickertape: "₹249", screener: "—" },
  { feature: "Pro (yearly)", mi: "₹999", tickertape: "₹2,399", screener: "₹4,999" },
  { feature: "AI research summaries and sentiment", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Pre-market morning briefing", mi: "Yes (Pro plan)", tickertape: "—", screener: "—" },
  { feature: "Concall tone tracking", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Daily brief in Hindi", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Instant Telegram alerts", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Claude MCP connector", mi: "Paid plans only", tickertape: "—", screener: "—" },
];

export const MARKETING_PLUS_LAUNCH_ACTIVE = plusLaunchOfferActive();
