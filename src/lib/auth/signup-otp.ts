import crypto from "crypto";
import { hasEmailConfigured, sendTransactionalEmail } from "@/lib/admin/email";
import { isFeatureEnabled } from "@/lib/api-guard";
import { GOOGLE_SANS_FONT_STACK } from "@/lib/typography";

export const SIGNUP_OTP_TTL_MIN = 10;
export const SIGNUP_OTP_MAX_ATTEMPTS = 8;
export const SIGNUP_OTP_RESEND_SEC = 45;

function otpSecret(): string {
  return process.env.AUTH_SECRET || process.env.SESSION_SECRET || "dev-only-insecure-secret-do-not-use-in-production";
}

export function generateSignupOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashSignupOtp(email: string, code: string): string {
  return crypto.createHmac("sha256", otpSecret()).update(`${email}:${code}`).digest("hex");
}

export function signupOtpMatches(email: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashSignupOtp(email, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** OTP when the admin switch is on (default) and Resend is configured. Local without mail keeps instant signup. */
export async function shouldChallengeSignupOtp(): Promise<boolean> {
  if (!(await isFeatureEnabled("signup-otp"))) return false;
  return hasEmailConfigured();
}

export async function sendSignupOtpEmail(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const html = `<div style="font-family:${GOOGLE_SANS_FONT_STACK};color:#1f1f1f;line-height:1.5;max-width:480px">
<p>Your Market Intelligence verification code is</p>
<p style="font-size:28px;letter-spacing:0.28em;font-variant-numeric:tabular-nums;font-weight:600">${code}</p>
<p>It expires in ${SIGNUP_OTP_TTL_MIN} minutes. If you did not create an account, ignore this email.</p>
</div>`;
  return sendTransactionalEmail({
    to,
    subject: `Your Market Intelligence code is ${code}`,
    html,
  });
}
