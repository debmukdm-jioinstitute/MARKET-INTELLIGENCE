/** Shared pricing copy for /pricing and marketing homepage (keep in sync with getRazorpayPlans). */

import { FREE_AI_ANALYSES_PER_MONTH } from "@/lib/payments/free-ai-quota";
import {
  FREE_SCANNER_SCANS_PER_MONTH,
  SCANNER_SCANS_BY_PLAN,
} from "@/lib/payments/scanner-quota";
import { formatInrFromPaise, getRazorpayPlans, plusLaunchOfferActive, type RazorpayPlanId, yearlySavingsCopy } from "@/lib/payments/plans";

export type PricingTierId = "free" | RazorpayPlanId;

export function stockScannerBenefitLine(tier: PricingTierId): string {
  const n =
    tier === "free"
      ? FREE_SCANNER_SCANS_PER_MONTH
      : SCANNER_SCANS_BY_PLAN[tier as RazorpayPlanId];
  return `Stock Scanner — ${n} distinct scan types per month (reopen same scan free)`;
}

/** Bullet benefits shown on /pricing, checkout cards, and landing. */
export const PRICING_PLAN_BULLETS: Record<PricingTierId, string[]> = {
  free: [
    stockScannerBenefitLine("free"),
    `${FREE_AI_ANALYSES_PER_MONTH} AI Desk + Options Flow analyses per month (shared counter)`,
    "Full website browse; preview-only on select intel modules",
    "Claude MCP not included",
  ],
  day_pass: [
    stockScannerBenefitLine("day_pass"),
    "Unlimited AI Desk + Options Flow for 24 hours",
    "Claude MCP connector included",
    "Full paid feature access for one day",
  ],
  pro_monthly: [
    stockScannerBenefitLine("pro_monthly"),
    "Unlimited AI Desk + Options Flow while subscribed",
    "Claude MCP connector included",
    "Cancel anytime",
  ],
  pro_annual: [
    stockScannerBenefitLine("pro_annual"),
    "Unlimited AI Desk + Options Flow while subscribed",
    "Claude MCP + Pro-only morning briefing & extras",
    "Best yearly value vs monthly Plus",
  ],
};

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
  `Free accounts get the full website with monthly caps: ${FREE_SCANNER_SCANS_PER_MONTH} Stock Scanner scan types, ${FREE_AI_ANALYSES_PER_MONTH} AI Desk + Options Flow analyses (shared AI counter), plus preview-only Company & Concall Intel, Search-trend intelligence, and Legal & insolvency. Daily pass (${SCANNER_SCANS_BY_PLAN.day_pass}), Plus (${SCANNER_SCANS_BY_PLAN.pro_monthly}), and Pro (${SCANNER_SCANS_BY_PLAN.pro_annual}) raise the scanner cap; paid plans also unlock unlimited AI runs and Claude MCP.`;

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
  {
    feature: "Stock Scanner (Nifty 500)",
    mi: `Free ${FREE_SCANNER_SCANS_PER_MONTH}/mo · Daily ${SCANNER_SCANS_BY_PLAN.day_pass} · Plus ${SCANNER_SCANS_BY_PLAN.pro_monthly} · Pro ${SCANNER_SCANS_BY_PLAN.pro_annual} scan types/mo`,
    tickertape: "Screener add-on",
    screener: "Limited free",
  },
  {
    feature: "AI Desk + Options Flow",
    mi: `Free ${FREE_AI_ANALYSES_PER_MONTH}/mo shared · unlimited on paid`,
    tickertape: "—",
    screener: "—",
  },
  { feature: "AI research summaries and sentiment", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Pre-market morning briefing", mi: "Yes (Pro plan)", tickertape: "—", screener: "—" },
  { feature: "Concall tone tracking", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Daily brief in Hindi", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Instant Telegram alerts", mi: "Yes", tickertape: "—", screener: "—" },
  { feature: "Claude MCP connector", mi: "Paid plans only", tickertape: "—", screener: "—" },
];

export const MARKETING_PLUS_LAUNCH_ACTIVE = plusLaunchOfferActive();
