import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, segmentOf, isCallable, type CallCandidate } from "./eligibility";

const now = new Date("2026-10-29T06:30:00Z"); // 12:00 IST
const base: CallCandidate = {
  phone: "98765 43210", callConsent: true, onDnd: false, currentPlan: "free",
  everPaid: false, lastPaidEndedAt: null, lastActiveAt: new Date("2026-10-27T00:00:00Z"),
  attemptsToday: 0, attempts30d: 0,
};

test("normalizePhone handles formats", () => {
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalizePhone("09876543210"), "+919876543210");
  assert.equal(normalizePhone("12345"), null);
});

test("active never-paid free user is upsell", () => {
  assert.equal(segmentOf(base, now), "upsell");
});

test("lapsed 10 days ago is winback; 40 days ago is none", () => {
  const d = (n: number) => new Date(now.getTime() - n * 86_400_000);
  assert.equal(segmentOf({ ...base, everPaid: true, lastPaidEndedAt: d(10) }, now), "winback");
  assert.equal(segmentOf({ ...base, everPaid: true, lastPaidEndedAt: d(40) }, now), "none");
});

test("no consent, DND, or attempts exhausted blocks calls", () => {
  assert.equal(isCallable(base, now), true);
  assert.equal(isCallable({ ...base, callConsent: false }, now), false);
  assert.equal(isCallable({ ...base, onDnd: true }, now), false);
  assert.equal(isCallable({ ...base, attemptsToday: 1 }, now), false);
  assert.equal(isCallable({ ...base, attempts30d: 3 }, now), false);
});

test("outside 09:00-21:00 IST blocks calls", () => {
  assert.equal(isCallable(base, new Date("2026-10-29T17:00:00Z")), false); // 22:30 IST
});
