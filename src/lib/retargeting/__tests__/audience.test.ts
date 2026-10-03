import { describe, expect, it } from "vitest";
import { applyTemplateVars, classifyRetargetingSegment, suggestedTemplateForSegment } from "@/lib/retargeting/audience";

describe("classifyRetargetingSegment", () => {
  it("marks lapsed when entitlement expired", () => {
    const seg = classifyRetargetingSegment({
      currentPlanId: "pro_monthly",
      entitlementActive: false,
      expiresAt: new Date("2020-01-01"),
      plansEverPurchased: ["pro_monthly"],
      paidOrderCount: 1,
    });
    expect(seg).toBe("lapsed_paid");
  });

  it("marks expiring soon for plus within 7 days", () => {
    const inThreeDays = new Date(Date.now() + 3 * 86_400_000);
    const seg = classifyRetargetingSegment({
      currentPlanId: "pro_monthly",
      entitlementActive: true,
      expiresAt: inThreeDays,
      plansEverPurchased: ["pro_monthly"],
      paidOrderCount: 1,
    });
    expect(seg).toBe("expiring_soon");
  });
});

describe("suggestedTemplateForSegment", () => {
  it("suggests plus upsell for active day pass", () => {
    expect(suggestedTemplateForSegment("active_day_pass", ["day_pass"])).toBe("upsell_day_to_plus");
  });
});

describe("applyTemplateVars", () => {
  it("replaces placeholders", () => {
    const out = applyTemplateVars("Hi {{firstName}}, plan {{currentPlan}}", {
      firstName: "Ada",
      currentPlan: "Plus plan",
    });
    expect(out).toBe("Hi Ada, plan Plus plan");
  });
});
