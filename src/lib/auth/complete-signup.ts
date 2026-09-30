import { hashPassword, isBootstrapAdmin } from "@/lib/admin/auth";
import { setSessionCookie } from "@/lib/admin/session-cookie";
import { sql } from "@/lib/db";
import { tagCustomerInKit } from "@/lib/kit";
import { sendWelcomePackToUser } from "@/lib/onboarding/send-welcome-pack";
import { after } from "next/server";
import { NextResponse } from "next/server";

/** Inserts the user, sets the session cookie, and queues the welcome pack. */
export async function completeEmailSignup(input: {
  email: string;
  name: string;
  passwordHash: string;
  origin: string;
}): Promise<NextResponse> {
  const role = isBootstrapAdmin(input.email) ? "admin" : "user";
  const db = sql();
  await db`
    INSERT INTO users (email, name, password_hash, role, last_login_at, privacy_accepted_at, email_verified_at)
    VALUES (${input.email}, ${input.name}, ${input.passwordHash}, ${role}, now(), now(), now())
  `;
  const sessionUser = { email: input.email, name: input.name, role: role as "admin" | "user", guest: false as const };
  const res = NextResponse.json({ ok: true, user: { email: input.email, name: input.name, role } });
  const out = setSessionCookie(res, sessionUser);
  after(() => {
    void sendWelcomePackToUser(sessionUser, input.origin);
    // Best-effort: tag the new customer in Kit so broadcasts reach them.
    // kit_tagged_at lets the daily cron skip successes and retry misses.
    void tagCustomerInKit(input.email, input.name).then(async (r) => {
      if (r.ok) {
        try {
          await db`UPDATE users SET kit_tagged_at = now() WHERE email = ${input.email}`;
        } catch {
          /* non-fatal: the cron will retry */
        }
      } else if (!r.skipped) {
        console.warn(`[kit] customer tag failed for ${input.email}: ${r.error}`);
      }
    });
  });
  return out;
}

export async function hashSignupPassword(password: string): Promise<string> {
  return hashPassword(password);
}
