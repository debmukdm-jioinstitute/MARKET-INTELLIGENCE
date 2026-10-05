import crypto from "crypto";
import {
  FOUNDER_REPLY_TO,
  getResendFromAddress,
  hasEmailConfigured,
  deliverabilityFromAddress,
  productionEmailMisconfiguredReason,
  sendTransactionalEmail,
} from "@/lib/admin/email";
import { preferKitOverResend } from "@/lib/admin/email-quota";
import { isFeatureEnabled } from "@/lib/api-guard";
import { isKitEmailConfigured } from "@/lib/kit";
import { escapeMiEmailHtml, miEmailParagraph, renderMarketIntelligenceEmail } from "@/lib/email/market-intelligence-layout";

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
  if (hasEmailConfigured() && !(await preferKitOverResend()) && !productionEmailMisconfiguredReason()) return true;
  return isKitEmailConfigured();
}

export async function sendSignupOtpEmail(to: string, code: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const misconfig = productionEmailMisconfiguredReason();
  if (misconfig) return { ok: false, error: misconfig };

  const fromConfigured = getResendFromAddress();
  const text = `Your Market Intelligence verification code is ${code}. It expires in ${SIGNUP_OTP_TTL_MIN} minutes. If you didn't request this, ignore this email.`;
  const html = renderMarketIntelligenceEmail({
    preheader: `Your verification code expires in ${SIGNUP_OTP_TTL_MIN} minutes`,
    badge: "VERIFICATION",
    title: "Your sign-up code",
    greeting: "Hi,",
    bodyHtml: miEmailParagraph("Enter this code to finish creating your Market Intelligence account:"),
    extraHtml: `<p style="margin:8px 0 16px;font-size:28px;font-weight:700;letter-spacing:0.28em;font-variant-numeric:tabular-nums;color:#202124;">${escapeMiEmailHtml(code)}</p>`,
    footnote: `It expires in ${SIGNUP_OTP_TTL_MIN} minutes. If you did not request this, you can ignore this email.`,
  });

  const sent = await sendTransactionalEmail({
    to,
    subject: `Your Market Intelligence verification code`,
    html,
    text,
    from: deliverabilityFromAddress(fromConfigured),
    replyTo: FOUNDER_REPLY_TO,
  });

  if (!sent.ok) {
    console.error("[signup-otp] send failed", to, sent.error, "from=", fromConfigured);
    return sent;
  }
  return sent;
}
