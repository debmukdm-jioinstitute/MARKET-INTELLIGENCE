import { isBootstrapAdmin, verifyPassword } from "@/lib/admin/auth";
import { setSessionCookie } from "@/lib/admin/session-cookie";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Accounts are not configured on this deployment yet." }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT email, name, password_hash, role FROM users WHERE email = ${email}`;
  const row = rows[0] as { email: string; name: string; password_hash: string; role: "user" | "admin" } | undefined;

  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Promote to admin if newly added to ADMIN_EMAILS since account creation.
  const role = isBootstrapAdmin(email) ? "admin" : row.role;
  if (role !== row.role) {
    await db`UPDATE users SET role = ${role} WHERE email = ${email}`;
  }
  await db`UPDATE users SET last_login_at = now() WHERE email = ${email}`;

  const res = NextResponse.json({ ok: true, user: { email: row.email, name: row.name, role } });
  return setSessionCookie(res, { email: row.email, name: row.name, role });
}
