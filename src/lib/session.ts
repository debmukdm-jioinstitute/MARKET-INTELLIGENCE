import { GUEST_EMAIL } from "@/lib/auth";
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
