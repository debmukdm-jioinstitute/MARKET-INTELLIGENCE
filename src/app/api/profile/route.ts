import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { loadProfile } from "@/lib/profile/load-profile";
import { PROFILE_DOCUMENTS } from "@/lib/profile/documents";
import { getSessionUser } from "@/lib/session";
import { FOUNDER_EMAIL, FOUNDER_NAME } from "@/lib/onboarding/welcome-email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function realUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

/** GET -> the signed-in member's profile, document list and founder contact. Works for every account, old or new. */
export async function GET() {
  const user = await realUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  return NextResponse.json({
    profile: await loadProfile(user),
    documents: PROFILE_DOCUMENTS,
    founder: { name: FOUNDER_NAME, email: FOUNDER_EMAIL },
  });
}

/** PATCH {newsletter: boolean} -> subscribe / unsubscribe from the newsletter. */
export async function PATCH(req: Request) {
  const user = await realUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.newsletter !== "boolean") return NextResponse.json({ error: "newsletter (boolean) required" }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: "Preferences are unavailable on this deployment." }, { status: 503 });

  await ensureSchema();
  const db = sql();
  const subscribe = body.newsletter as boolean;
  await db`UPDATE users SET newsletter_opt_out = ${!subscribe} WHERE email = ${user.email}`;
  if (subscribe) {
    await db`
      INSERT INTO newsletter_subscribers (email, status, source) VALUES (${user.email}, 'subscribed', 'profile')
      ON CONFLICT (email) DO UPDATE SET status = 'subscribed', unsubscribed_at = NULL
    `;
  } else {
    await db`UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = now() WHERE email = ${user.email}`;
  }
  return NextResponse.json({ ok: true, newsletterSubscribed: subscribe });
}
