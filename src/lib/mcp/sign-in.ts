import { isGoogleOnlyPasswordHash } from "@/lib/auth/google-oauth";
import { isBootstrapAdmin, verifyPassword } from "@/lib/admin/auth";
import { signSessionPayload } from "@/lib/auth-crypto";
import type { SessionUser } from "@/lib/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";

export async function mcpSignIn(emailRaw: string, password: string): Promise<
  | { ok: true; sessionToken: string; user: SessionUser }
  | { ok: false; error: string }
> {
  if (!hasDatabase()) return { ok: false, error: "Accounts are not configured on this deployment." };

  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: "Email and password are required." };

  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT email, name, password_hash, role FROM users WHERE email = ${email}`;
  const row = rows[0] as { email: string; name: string; password_hash: string; role: "user" | "admin" } | undefined;

  if (!row) return { ok: false, error: "Invalid email or password." };
  if (isGoogleOnlyPasswordHash(row.password_hash)) {
    return { ok: false, error: "This account uses Google sign-in. Use the website OAuth flow." };
  }
  if (!(await verifyPassword(password, row.password_hash))) {
    return { ok: false, error: "Invalid email or password." };
  }

  const role = isBootstrapAdmin(email) ? "admin" : row.role;
  if (role !== row.role) await db`UPDATE users SET role = ${role} WHERE email = ${email}`;
  await db`UPDATE users SET last_login_at = now() WHERE email = ${email}`;

  const user: SessionUser = { email: row.email, name: row.name, guest: false, role };
  const sessionToken = signSessionPayload(user);
  return { ok: true, sessionToken, user };
}
