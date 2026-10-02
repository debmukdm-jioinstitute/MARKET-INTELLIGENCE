import { describe, expect, it } from "vitest";
import {
  FREE_SCANNER_SCANS_PER_MONTH,
  SCANNER_SCANS_BY_PLAN,
  scannerMonthlyLimit,
  scannerTierLabel,
} from "@/lib/payments/scanner-quota";
import type { SessionUser } from "@/lib/auth";

const user = (role: "user" | "admin" = "user"): SessionUser => ({
  email: "a@example.com",
  name: "A",
  role,
  guest: false,
});

describe("scannerMonthlyLimit", () => {
  it("free tier gets 5", () => {
    expect(scannerMonthlyLimit(user(), null, false)).toBe(FREE_SCANNER_SCANS_PER_MONTH);
  });

  it("paid tiers match caps", () => {
    expect(scannerMonthlyLimit(user(), "day_pass", true)).toBe(SCANNER_SCANS_BY_PLAN.day_pass);
    expect(scannerMonthlyLimit(user(), "pro_monthly", true)).toBe(SCANNER_SCANS_BY_PLAN.pro_monthly);
    expect(scannerMonthlyLimit(user(), "pro_annual", true)).toBe(SCANNER_SCANS_BY_PLAN.pro_annual);
  });

  it("lapsed paid falls back to free", () => {
    expect(scannerMonthlyLimit(user(), "pro_monthly", false)).toBe(FREE_SCANNER_SCANS_PER_MONTH);
  });
});

describe("scannerTierLabel", () => {
  it("labels tiers", () => {
    expect(scannerTierLabel(user(), null, false)).toBe("Free");
    expect(scannerTierLabel(user(), "pro_monthly", true)).toBe("Plus");
    expect(scannerTierLabel(user("admin"), "pro_annual", true)).toBe("Admin");
  });
});
