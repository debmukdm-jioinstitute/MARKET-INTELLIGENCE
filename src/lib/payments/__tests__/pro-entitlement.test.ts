import { describe, expect, it } from "vitest";
import { computeProExpiry, isProEntitlementActive, proDurationDays } from "@/lib/payments/pro-entitlement";

describe("pro entitlement", () => {
  it("computes plan durations", () => {
    expect(proDurationDays("day_pass")).toBe(1);
    expect(proDurationDays("pro_monthly")).toBe(30);
    expect(proDurationDays("pro_annual")).toBe(365);
  });

  it("day pass is 24 hours from anchor", () => {
    const base = new Date("2026-01-01T12:00:00.000Z");
    const exp = computeProExpiry(base, "day_pass");
    expect(exp.getTime() - base.getTime()).toBe(24 * 3_600_000);
  });

  it("extends expiry from anchor date", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const exp = computeProExpiry(base, "pro_monthly");
    expect(exp.toISOString().slice(0, 10)).toBe("2026-01-31");
  });

  it("detects active window", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isProEntitlementActive(future)).toBe(true);
    expect(isProEntitlementActive("2020-01-01")).toBe(false);
  });
});
