import { hasOutboundEmailConfigured, productionEmailMisconfiguredReason } from "@/lib/admin/email";
import { rateLimited } from "@/lib/api-guard";
import { isKitEmailConfigured } from "@/lib/kit";
import { generateSignupOtp, hashSignupOtp, sendSignupOtpEmail, SIGNUP_OTP_RESEND_SEC, SIGNUP_OTP_TTL_MIN } from "@/lib/auth/signup-otp";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Accounts are not configured on this deployment yet." }, { status: 503 });
  }
  if (!hasOutboundEmailConfigured()) {
    return NextResponse.json({ error: "Email is not configured on this deployment." }, { status: 503 });
  }
  const mailMisconfig = productionEmailMisconfiguredReason();
  if (mailMisconfig && !isKitEmailConfigured()) {
    return NextResponse.json({ error: mailMisconfig }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  if (await rateLimited(`signup-otp-resend:${email}:${clientIp(req)}`, 1, SIGNUP_OTP_RESEND_SEC)) {
    return NextResponse.json({ error: `Wait ${SIGNUP_OTP_RESEND_SEC} seconds before requesting another code.` }, { status: 429 });
  }
  if (await rateLimited(`signup-otp:${email}:${clientIp(req)}`, 5, 3600)) {
    return NextResponse.json({ error: "Too many codes. Try again later." }, { status: 429 });
  }

  await ensureSchema();
  const db = sql();
  const taken = await db`SELECT email FROM users WHERE email = ${email}`;
  if (taken.length > 0) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }
  const rows = await db`SELECT email, created_at FROM signup_otps WHERE email = ${email}`;
  const pending = rows[0] as { email: string; created_at: Date | string } | undefined;
  if (!pending) {
    return NextResponse.json({ error: "No pending sign-up for that email. Start again." }, { status: 404 });
  }
  const waitMs = SIGNUP_OTP_RESEND_SEC * 1000 - (Date.now() - new Date(pending.created_at).getTime());
  if (waitMs > 0) {
    return NextResponse.json(
      { error: `Wait ${Math.ceil(waitMs / 1000)} seconds before requesting another code.` },
      { status: 429 },
    );
  }

  const code = generateSignupOtp();
  const codeHash = hashSignupOtp(email, code);
  const sent = await sendSignupOtpEmail(email, code);
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error ?? "Could not send the verification code." }, { status: 502 });
  }
  await db`
    UPDATE signup_otps
    SET code_hash = ${codeHash}, attempts = 0, created_at = now(),
        expires_at = now() + make_interval(mins => ${SIGNUP_OTP_TTL_MIN})
    WHERE email = ${email}
  `;
  return NextResponse.json({ ok: true, email });
}
