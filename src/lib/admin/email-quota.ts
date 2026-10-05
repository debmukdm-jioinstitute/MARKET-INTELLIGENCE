import { getState, setState } from "@/lib/notify/store";

const STATE_KEY = "email:resend-quota";

type QuotaState = { month: string; count: number; exhausted: boolean };

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function resendMonthlyLimit(): number {
  const n = Number(process.env.RESEND_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3000;
}

export function isResendQuotaError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /(monthly|daily)\s+(email\s+)?(quota|limit)/i.test(message) ||
    /quota\s+(exceeded|reached|limit)/i.test(message) ||
    /exceeded\s+(your\s+)?(monthly|daily)\s+limit/i.test(message) ||
    /only\s+send\s+\d+/i.test(message)
  );
}

async function readQuota(): Promise<QuotaState> {
  const month = currentMonth();
  const raw = await getState<QuotaState>(STATE_KEY);
  if (!raw || raw.month !== month) return { month, count: 0, exhausted: false };
  return raw;
}

/** True when Resend returned a quota error — route mail through Kit. Counter is display-only (not routing). */
export async function preferKitOverResend(): Promise<boolean> {
  if (process.env.EMAIL_FORCE_KIT === "1" || process.env.EMAIL_FORCE_KIT === "true") return true;
  const st = await readQuota();
  return st.exhausted;
}

export async function getResendQuotaSnapshot(): Promise<QuotaState & { limit: number }> {
  const st = await readQuota();
  return { ...st, limit: resendMonthlyLimit() };
}

export async function recordResendSend(sends = 1): Promise<void> {
  if (sends <= 0) return;
  const st = await readQuota();
  await setState(STATE_KEY, {
    month: st.month,
    count: st.count + sends,
    exhausted: st.exhausted,
  });
}

/** Clears Kit-forced routing after a mistaken quota flag (Admin → System). */
export async function resetResendQuotaRouting(): Promise<QuotaState & { limit: number }> {
  const month = currentMonth();
  const next = { month, count: 0, exhausted: false };
  await setState(STATE_KEY, next);
  return { ...next, limit: resendMonthlyLimit() };
}

export async function markResendQuotaExhausted(): Promise<void> {
  const st = await readQuota();
  await setState(STATE_KEY, { month: st.month, count: st.count, exhausted: true });
}
