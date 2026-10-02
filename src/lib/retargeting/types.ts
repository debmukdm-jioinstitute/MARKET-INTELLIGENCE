import type { RazorpayPlanId } from "@/lib/payments/plans";

export type RetargetingSegment =
  | "active_day_pass"
  | "active_plus"
  | "active_annual"
  | "lapsed_paid"
  | "expiring_soon";

export type RetargetingCustomerRow = {
  email: string;
  name: string | null;
  pro_plan: string | null;
  pro_expires_at: Date | string | null;
  paid_order_count: number;
  last_paid_at: Date | string | null;
  plans_purchased: string[] | null;
};

export type RetargetingCustomer = {
  email: string;
  name: string | null;
  segment: RetargetingSegment;
  suggestedTemplateId: string;
  currentPlanId: RazorpayPlanId | null;
  currentPlanLabel: string;
  entitlementActive: boolean;
  expiresAt: string | null;
  lastPaidAt: string | null;
  paidOrderCount: number;
  plansEverPurchased: RazorpayPlanId[];
};

export type RetargetingTemplateId =
  | "upsell_day_to_plus"
  | "upsell_plus_to_annual"
  | "win_back_lapsed"
  | "renew_expiring_plus";

export type RetargetingTemplate = {
  id: RetargetingTemplateId;
  label: string;
  goal: "upsell" | "cross_sell" | "win_back" | "renew";
  segments: RetargetingSegment[];
  targetPlanId: RazorpayPlanId | null;
  subjectTemplate: string;
  bodyTemplate: string;
};

export type RetargetingPreview = {
  email: string;
  subject: string;
  html: string;
};
