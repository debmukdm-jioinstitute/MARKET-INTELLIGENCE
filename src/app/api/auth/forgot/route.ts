import { hasEmailConfigured, sendTransactionalEmail } from "@/lib/admin/email";
import { isGoogleOnlyPasswordHash } from "@/lib/auth/google-oauth";
import { createResetToken } from "@/lib/auth/password-reset";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GENERIC = { ok: true, message: "If an account exists for that email, a reset link is on its way." };

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Accounts are not configured on this deployment yet." }, { status: 503 });
  }
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (!hasEmailConfigured()) {
    return NextResponse.json({ error: "Password reset email is not configured on this deployment." }, { status: 503 });
  }

  await ensureSchema();
  const rows = await sql()`SELECT password_hash FROM users WHERE email = ${email}`;
  const row = rows[0] as { password_hash: string } | undefined;
  // Same response whether or not the account exists (no email enumeration). Google-only accounts have no password to reset.
  if (row && !isGoogleOnlyPasswordHash(row.password_hash)) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const link = `${base}/reset-password?token=${encodeURIComponent(createResetToken(email, row.password_hash))}`;
    await sendTransactionalEmail({
      to: email,
      subject: "Reset your Market Intelligence password",
      html: `<p>We received a request to reset your password.</p><p><a href="${link}">Choose a new password</a></p><p>This link expires in 1 hour and works once. If you did not ask for this, ignore this email.</p>`,
    });
  }
  return NextResponse.json(GENERIC);
}
