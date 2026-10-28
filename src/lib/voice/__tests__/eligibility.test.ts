import { describe, expect, it } from "vitest";
import { normalizePhone, segmentOf, isCallable, type CallCandidate } from "../eligibility";

const now = new Date("2026-10-29T06:30:00Z"); // 12:00 IST
const base: CallCandidate = {
  phone: "98765 43210", callConsent: true, onDnd: false, currentPlan: "free",
  everPaid: false, lastPaidEndedAt: null, lastActiveAt: new Date("2026-10-27T00:00:00Z"),
  attemptsToday: 0, attempts30d: 0,
};

describe("voice eligibility", () => {
  it("normalizePhone handles formats", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("09876543210")).toBe("+919876543210");
    expect(normalizePhone("12345")).toBeNull();
  });

  it("active never-paid free user is upsell", () => {
    expect(segmentOf(base, now)).toBe("upsell");
  });

  it("lapsed 10 days ago is winback; 40 days ago is none", () => {
    const d = (n: number) => new Date(now.getTime() - n * 86_400_000);
    expect(segmentOf({ ...base, everPaid: true, lastPaidEndedAt: d(10) }, now)).toBe("winback");
    expect(segmentOf({ ...base, everPaid: true, lastPaidEndedAt: d(40) }, now)).toBe("none");
  });

  it("no consent, DND, or attempts exhausted blocks calls", () => {
    expect(isCallable(base, now)).toBe(true);
    expect(isCallable({ ...base, callConsent: false }, now)).toBe(false);
    expect(isCallable({ ...base, onDnd: true }, now)).toBe(false);
    expect(isCallable({ ...base, attemptsToday: 1 }, now)).toBe(false);
    expect(isCallable({ ...base, attempts30d: 3 }, now)).toBe(false);
  });

  it("outside 09:00-21:00 IST blocks calls", () => {
    expect(isCallable(base, new Date("2026-10-29T17:00:00Z"))).toBe(false); // 22:30 IST
  });
});
