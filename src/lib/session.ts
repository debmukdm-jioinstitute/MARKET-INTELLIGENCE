import { GUEST_EMAIL } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * Reads the same `mi_session` cookie the client-side auth already sets
 * (see src/app/api/auth/session/route.ts) — this app has no server-verified
 * auth today, so this identifies a user for storage purposes on trust,
 * consistent with the rest of the app's existing security posture.
 */
export async function getSessionEmail(): Promise<string> {
  const store = await cookies();
  const raw = store.get("mi_session")?.value;
  if (!raw) return GUEST_EMAIL;
  try {
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email?.trim().toLowerCase() || GUEST_EMAIL;
  } catch {
    return GUEST_EMAIL;
  }
}
