import { isProEntitlementActive } from "@/lib/payments/pro-entitlement";
import { formatInrFromPaise, getRazorpayPlan, getRazorpayPlans, parseActivePlanId, type RazorpayPlanId, yearlySavingsCopy } from "@/lib/payments/plans";
import type { RetargetingCustomer, RetargetingCustomerRow, RetargetingSegment } from "@/lib/retargeting/types";
import { getRetargetingTemplate } from "@/lib/retargeting/templates";

const PLAN_LABEL: Record<RazorpayPlanId, string> = {
  day_pass: "Daily pass",
  pro_monthly: "Plus plan",
  pro_annual: "Pro plan (yearly)",
};

const EXPIRING_SOON_MS = 7 * 86_400_000;

export function planLabel(planId: RazorpayPlanId | null): string {
  if (!planId) return "Free";
  return PLAN_LABEL[planId] ?? planId;
}

function parsePurchasedPlans(raw: string[] | null): RazorpayPlanId[] {
  if (!raw?.length) return [];
  const out: RazorpayPlanId[] = [];
  for (const p of raw) {
    const id = parseActivePlanId(p);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export function classifyRetargetingSegment(input: {
  currentPlanId: RazorpayPlanId | null;
  entitlementActive: boolean;
  expiresAt: Date | null;
  plansEverPurchased: RazorpayPlanId[];
  paidOrderCount: number;
}): RetargetingSegment {
  const { currentPlanId, entitlementActive, expiresAt, plansEverPurchased, paidOrderCount } = input;
  if (paidOrderCount === 0 && !currentPlanId) return "lapsed_paid";

  if (entitlementActive && expiresAt) {
    const msLeft = expiresAt.getTime() - Date.now();
    if (msLeft > 0 && msLeft <= EXPIRING_SOON_MS && currentPlanId === "pro_monthly") {
      return "expiring_soon";
    }
  }

  if (entitlementActive) {
    if (currentPlanId === "pro_annual") return "active_annual";
    if (currentPlanId === "pro_monthly") return "active_plus";
    if (currentPlanId === "day_pass") return "active_day_pass";
  }

  return "lapsed_paid";
}

export function suggestedTemplateForSegment(segment: RetargetingSegment, plansEverPurchased: RazorpayPlanId[]): string {
  if (segment === "expiring_soon") return "renew_expiring_plus";
  if (segment === "active_annual") return "";
  if (segment === "active_day_pass") return "upsell_day_to_plus";
  if (segment === "active_plus") {
    return plansEverPurchased.includes("pro_annual") ? "renew_expiring_plus" : "upsell_plus_to_annual";
  }
  const hadAnnual = plansEverPurchased.includes("pro_annual");
  const hadPlus = plansEverPurchased.includes("pro_monthly");
  if (hadAnnual) return "win_back_lapsed";
  if (hadPlus) return "win_back_lapsed";
  return "upsell_day_to_plus";
}

export function rowToRetargetingCustomer(row: RetargetingCustomerRow): RetargetingCustomer {
  const currentPlanId = parseActivePlanId(row.pro_plan);
  const expiresAt = row.pro_expires_at ? new Date(row.pro_expires_at) : null;
  const entitlementActive = isProEntitlementActive(expiresAt);
  const plansEverPurchased = parsePurchasedPlans(row.plans_purchased);
  const segment = classifyRetargetingSegment({
    currentPlanId,
    entitlementActive,
    expiresAt,
    plansEverPurchased,
    paidOrderCount: row.paid_order_count,
  });
  const suggested = suggestedTemplateForSegment(segment, plansEverPurchased);
  const tpl = suggested ? getRetargetingTemplate(suggested) : null;
  const finalTemplateId =
    tpl && tpl.segments.includes(segment) ? suggested : tpl?.id ?? (segment === "lapsed_paid" ? "win_back_lapsed" : "");

  return {
    email: row.email,
    name: row.name,
    segment,
    suggestedTemplateId: finalTemplateId,
    currentPlanId,
    currentPlanLabel: planLabel(currentPlanId),
    entitlementActive,
    expiresAt: expiresAt?.toISOString() ?? null,
    lastPaidAt: row.last_paid_at ? new Date(row.last_paid_at).toISOString() : null,
    paidOrderCount: row.paid_order_count,
    plansEverPurchased,
  };
}

export type RetargetingTemplateVars = Record<string, string>;

export function buildTemplateVars(customer: RetargetingCustomer, templateTargetPlanId: RazorpayPlanId | null, siteUrl: string): RetargetingTemplateVars {
  const firstName = (customer.name?.trim().split(/\s+/)[0] || customer.email.split("@")[0] || "there").replace(/[<>]/g, "");
  const pricingUrl = `${siteUrl.replace(/\/$/, "")}/pricing`;
  const targetPlan = templateTargetPlanId ? getRazorpayPlan(templateTargetPlanId) : null;
  const annual = getRazorpayPlans().find((p) => p.id === "pro_annual");
  const expiresAt = customer.expiresAt ? new Date(customer.expiresAt) : null;
  let expiresPhrase = "already";
  let expiresAtShort = "soon";
  if (expiresAt && Number.isFinite(expiresAt.getTime())) {
    expiresAtShort = expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    expiresPhrase = customer.entitlementActive
      ? `on ${expiresAtShort}`
      : `on ${expiresAtShort}`;
    if (!customer.entitlementActive) expiresPhrase = `on ${expiresAtShort}`;
  } else if (!customer.entitlementActive && customer.paidOrderCount > 0) {
    expiresPhrase = "recently";
  }

  const launchOfferLine =
    targetPlan?.id === "pro_monthly" && targetPlan.description.includes("Launch offer")
      ? targetPlan.description
      : "";

  return {
    firstName,
    currentPlan: customer.currentPlanLabel,
    expiresPhrase,
    expiresAtShort,
    targetPrice: targetPlan ? formatInrFromPaise(targetPlan.amountPaise) : "",
    targetInterval: targetPlan?.intervalLabel ?? "",
    annualPrice: annual ? formatInrFromPaise(annual.amountPaise) : "",
    annualInterval: annual?.intervalLabel ?? "",
    savingsLine: yearlySavingsCopy(),
    launchOfferLine,
    pricingUrl,
  };
}

export function applyTemplateVars(template: string, vars: RetargetingTemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
