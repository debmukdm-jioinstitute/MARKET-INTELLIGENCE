import { rateLimited } from "@/lib/api-guard";
import { defaultSiteUrl, loadOnboardingFormModelForUser } from "@/lib/onboarding/load-form-model";
import { sendWelcomePackWithResult } from "@/lib/onboarding/send-welcome-pack";
import { renderWelcomeEmailHtml, welcomeEmailSubject } from "@/lib/onboarding/welcome-email";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function realUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

/** GET -> the founder's welcome email exactly as it is sent, rendered for this member (subject + HTML). */
export async function GET(req: Request) {
  const user = await realUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const model = await loadOnboardingFormModelForUser(user, defaultSiteUrl(new URL(req.url).origin));
  const firstName = user.name.split(/\s+/)[0] || "there";
  return NextResponse.json({ subject: welcomeEmailSubject(firstName), html: renderWelcomeEmailHtml(model) });
}

/** POST -> email the founder welcome letter (HTML only). 3 per hour. */
export async function POST(req: Request) {
  const user = await realUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (await rateLimited(`welcome-copy:${user.email}`, 3, 3600)) {
    return NextResponse.json({ error: "You've requested this a few times already. Please try again in an hour." }, { status: 429 });
  }
  const result = await sendWelcomePackWithResult(user, new URL(req.url).origin);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Could not send the email." }, { status: 502 });
  return NextResponse.json({ ok: true, sentTo: user.email });
}
