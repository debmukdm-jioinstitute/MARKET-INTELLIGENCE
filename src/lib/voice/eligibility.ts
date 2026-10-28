export type Segment = "upsell" | "winback" | "none";

export interface CallCandidate {
  phone: string;
  callConsent: boolean;
  onDnd: boolean;
  currentPlan: "free" | "daily" | "plus" | "pro";
  everPaid: boolean;
  lastPaidEndedAt: Date | null;
  lastActiveAt: Date | null;
  attemptsToday: number;
  attempts30d: number;
}

/** Normalise Indian numbers to +91XXXXXXXXXX, or null if invalid. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2)
    : digits.length === 11 && digits.startsWith("0") ? digits.slice(1)
    : digits;
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}

export function inCallingWindow(now: Date): boolean {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  const h = ist.getUTCHours();
  return h >= 9 && h < 21;
}

export function segmentOf(c: CallCandidate, now: Date): Segment {
  if (c.currentPlan !== "free") return "none";
  const day = 86_400_000;
  if (c.everPaid && c.lastPaidEndedAt) {
    const age = (now.getTime() - c.lastPaidEndedAt.getTime()) / day;
    return age >= 3 && age <= 30 ? "winback" : "none";
  }
  const active = c.lastActiveAt && (now.getTime() - c.lastActiveAt.getTime()) / day <= 14;
  return !c.everPaid && active ? "upsell" : "none";
}

export function isCallable(c: CallCandidate, now: Date): boolean {
  return (
    normalizePhone(c.phone) !== null &&
    c.callConsent &&
    !c.onDnd &&
    c.attemptsToday < 1 &&
    c.attempts30d < 3 &&
    inCallingWindow(now) &&
    segmentOf(c, now) !== "none"
  );
}
