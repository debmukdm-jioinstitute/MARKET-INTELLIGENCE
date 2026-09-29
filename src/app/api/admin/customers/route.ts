import { deleteRegisteredAccount } from "@/lib/admin/delete-account";
import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ customers: [], you: guard.user.email });

  await ensureSchema();
  const db = sql();
  const customers = await db`
    SELECT email, name, role, created_at, last_login_at
    FROM users
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ customers, you: guard.user.email });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  if (email === guard.user.email.toLowerCase()) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();
  const [target] = (await db`SELECT email, role FROM users WHERE email = ${email}`) as {
    email: string;
    role: "user" | "admin";
  }[];
  if (!target) return NextResponse.json({ error: "No account with that email." }, { status: 404 });

  if (target.role === "admin") {
    const [{ n }] = (await db`SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND email <> ${email}`) as {
      n: number;
    }[];
    if (n === 0) {
      return NextResponse.json({ error: "Cannot delete the last admin account." }, { status: 409 });
    }
  }

  const deleted = await deleteRegisteredAccount(email);
  if (!deleted) return NextResponse.json({ error: "No account with that email." }, { status: 404 });
  return NextResponse.json({ ok: true, email });
}
