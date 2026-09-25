import { GUEST_EMAIL, type SessionUser } from "@/lib/auth";
import { verifySessionToken } from "@/lib/auth-crypto";
import { cookies } from "next/headers";

/**
 * Reads and cryptographically verifies the `mi_session` cookie.
 * Ensures the session token has a valid HMAC-SHA256 signature and has not
 * been tampered with or forged. Falls back securely to GUEST_EMAIL.
 */
export async function getSessionEmail(): Promise<string> {
  const store = await cookies();
  const raw = store.get("mi_session")?.value;
  if (!raw) return GUEST_EMAIL;

  const session = verifySessionToken<{ email?: string }>(raw);
  if (!session || !session.email) {
    return GUEST_EMAIL;
  }
  return session.email.trim().toLowerCase() || GUEST_EMAIL;
}

/** Full verified session (email, name, role, guest flag), or null if unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get("mi_session")?.value;
  if (!raw) return null;
  const session = verifySessionToken<SessionUser>(raw);
  if (!session?.email) return null;
  return {
    email: session.email.trim().toLowerCase(),
    name: session.name ?? "Investor",
    guest: Boolean(session.guest),
    role: session.role === "admin" ? "admin" : "user",
  };
}

/** Throws-free admin guard for API routes: returns the session user only if role === "admin". */
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user && !user.guest && user.role === "admin" ? user : null;
}

/** True when the caller has no real account (no cookie, or the shared guest identity) — such callers must never touch shared DB rows. */
export async function isGuestSession(): Promise<boolean> {
  return (await getSessionEmail()) === GUEST_EMAIL;
}
