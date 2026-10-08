import { hashPassword } from "@/lib/admin/auth";
import { rateLimited } from "@/lib/api-guard";
import { clientIp } from "@/lib/client-ip";
import { completeEmailSignup, hashSignupPassword } from "@/lib/auth/complete-signup";
import { generateSignupOtp, hashSignupOtp, sendSignupOtpEmail, shouldChallengeSignupOtp, SIGNUP_OTP_TTL_MIN } from "@/lib/auth/signup-otp";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Accounts are not configured on this deployment yet." }, { status: 503 });
  }

  let body: { name?: string; email?: string; password?: string; acceptPrivacy?: boolean; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || "Investor";
  const password = body.password ?? "";
  const refCode =
    (typeof body.ref === "string" && body.ref.trim()) || new URL(req.url).searchParams.get("ref") || null;
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (body.acceptPrivacy !== true) {
    return NextResponse.json(
      { error: "You must read and accept the Privacy Policy to create an account." },
      { status: 400 },
    );
  }

  await ensureSchema();
  const db = sql();

  const existing = await db`SELECT email FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  if (await shouldChallengeSignupOtp()) {
    if (await rateLimited(`signup-otp:${email}:${clientIp(req)}`, 5, 3600)) {
      return NextResponse.json({ error: "Too many codes. Try again later." }, { status: 429 });
    }
    const passwordHash = await hashSignupPassword(password);
    const code = generateSignupOtp();
    const codeHash = hashSignupOtp(email, code);
    const sent = await sendSignupOtpEmail(email, code);
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error ?? "Could not send the verification code." }, { status: 502 });
    }
    await db`
      INSERT INTO signup_otps (email, name, password_hash, code_hash, attempts, created_at, expires_at, referral_code)
      VALUES (${email}, ${name}, ${passwordHash}, ${codeHash}, 0, now(), now() + make_interval(mins => ${SIGNUP_OTP_TTL_MIN}), ${refCode})
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        code_hash = EXCLUDED.code_hash,
        attempts = 0,
        created_at = now(),
        expires_at = EXCLUDED.expires_at,
        referral_code = EXCLUDED.referral_code
    `;
    return NextResponse.json({ ok: true, pending: true, email });
  }

  return completeEmailSignup({
    email,
    name,
    passwordHash: await hashPassword(password),
    origin: new URL(req.url).origin,
    referralCode: refCode,
  });
}
