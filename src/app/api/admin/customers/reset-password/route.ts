import { requireAdmin } from "@/lib/admin/guard";
import { hashPassword } from "@/lib/admin/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const newPassword = String(body.newPassword ?? "");
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  await ensureSchema();
  const db = sql();
  const existing = await db`SELECT email FROM users WHERE email = ${email}`;
  if (existing.length === 0) return NextResponse.json({ error: "No account with that email." }, { status: 404 });

  const passwordHash = await hashPassword(newPassword);
  await db`UPDATE users SET password_hash = ${passwordHash} WHERE email = ${email}`;
  return NextResponse.json({ ok: true });
}
