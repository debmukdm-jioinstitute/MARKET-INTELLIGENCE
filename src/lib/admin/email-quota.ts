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
  return /(monthly|daily).*(quota|limit)|quota.*exceeded|exceeded.*quota|too many emails|rate limit|429/i.test(message);
}

async function readQuota(): Promise<QuotaState> {
  const month = currentMonth();
  const raw = await getState<QuotaState>(STATE_KEY);
  if (!raw || raw.month !== month) return { month, count: 0, exhausted: false };
  return raw;
}

/** True when Resend free tier is treated as exhausted — route mail through Kit. */
export async function preferKitOverResend(): Promise<boolean> {
  if (process.env.EMAIL_FORCE_KIT === "1" || process.env.EMAIL_FORCE_KIT === "true") return true;
  const st = await readQuota();
  if (st.exhausted) return true;
  return st.count >= resendMonthlyLimit();
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
    exhausted: st.exhausted || st.count + sends >= resendMonthlyLimit(),
  });
}

export async function markResendQuotaExhausted(): Promise<void> {
  const st = await readQuota();
  await setState(STATE_KEY, { month: st.month, count: st.count, exhausted: true });
}
