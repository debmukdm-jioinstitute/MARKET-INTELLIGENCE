import { describe, expect, it } from "vitest";
import { FREE_AI_ANALYSES_PER_MONTH, freeAiPeriodKey } from "@/lib/payments/free-ai-quota";

describe("free AI quota", () => {
  it("uses IST calendar month key", () => {
    const key = freeAiPeriodKey(new Date("2026-10-15T20:00:00.000Z"));
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });

  it("exports monthly limit of 5", () => {
    expect(FREE_AI_ANALYSES_PER_MONTH).toBe(5);
  });
});
