import { hashPassword } from "@/lib/admin/auth";
import { matchesFingerprint, readResetToken } from "@/lib/auth/password-reset";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INVALID = "This reset link is invalid or has expired. Request a new one.";

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Accounts are not configured on this deployment yet." }, { status: 503 });
  }
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const password = body.password ?? "";
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  const parsed = readResetToken(body.token ?? "");
  if (!parsed) return NextResponse.json({ error: INVALID }, { status: 400 });

  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT password_hash FROM users WHERE email = ${parsed.email}`;
  const row = rows[0] as { password_hash: string } | undefined;
  if (!row || !matchesFingerprint(row.password_hash, parsed.fingerprint)) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }
  const next = await hashPassword(password);
  await db`UPDATE users SET password_hash = ${next} WHERE email = ${parsed.email}`;
  return NextResponse.json({ ok: true });
}
