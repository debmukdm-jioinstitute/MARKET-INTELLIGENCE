import { hashPassword, isBootstrapAdmin } from "@/lib/admin/auth";
import { setSessionCookie } from "@/lib/admin/session-cookie";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Accounts are not configured on this deployment yet." }, { status: 503 });
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || "Investor";
  const password = body.password ?? "";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  await ensureSchema();
  const db = sql();

  const existing = await db`SELECT email FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const role = isBootstrapAdmin(email) ? "admin" : "user";
  await db`
    INSERT INTO users (email, name, password_hash, role, last_login_at)
    VALUES (${email}, ${name}, ${passwordHash}, ${role}, now())
  `;

  const res = NextResponse.json({ ok: true, user: { email, name, role } });
  return setSessionCookie(res, { email, name, role });
}
