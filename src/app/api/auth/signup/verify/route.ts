import { completeEmailSignup } from "@/lib/auth/complete-signup";
import { SIGNUP_OTP_MAX_ATTEMPTS, signupOtpMatches } from "@/lib/auth/signup-otp";
import { rateLimited } from "@/lib/api-guard";
import { clientIp } from "@/lib/client-ip";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Accounts are not configured on this deployment yet." }, { status: 503 });
  }

  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = String(body.code ?? "").replace(/\D/g, "");
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (code.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });

  if (await rateLimited(`signup-otp-verify:${email}:${clientIp(req)}`, 20, 3600)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  await ensureSchema();
  const db = sql();
  const taken = await db`SELECT email FROM users WHERE email = ${email}`;
  if (taken.length > 0) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const rows = await db`
    SELECT email, name, password_hash, code_hash, attempts, expires_at, referral_code
    FROM signup_otps WHERE email = ${email}
  `;
  const pending = rows[0] as
    | { email: string; name: string; password_hash: string; code_hash: string; attempts: number; expires_at: Date | string; referral_code: string | null }
    | undefined;
  if (!pending) {
    return NextResponse.json({ error: "No pending sign-up for that email. Start again." }, { status: 404 });
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 400 });
  }
  if (pending.attempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many incorrect codes. Request a new one." }, { status: 429 });
  }
  if (!signupOtpMatches(email, code, pending.code_hash)) {
    await db`UPDATE signup_otps SET attempts = attempts + 1 WHERE email = ${email}`;
    return NextResponse.json({ error: "That code is incorrect." }, { status: 400 });
  }

  await db`DELETE FROM signup_otps WHERE email = ${email}`;
  return completeEmailSignup({
    email,
    name: pending.name,
    passwordHash: pending.password_hash,
    origin: new URL(req.url).origin,
    referralCode: pending.referral_code,
  });
}
