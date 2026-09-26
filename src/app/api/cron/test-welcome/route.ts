import { cronUnauthorized } from "@/lib/api-guard";
import { sendWelcomePackToUser } from "@/lib/onboarding/send-welcome-pack";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/cron/test-welcome?email=... — send onboarding welcome + PDF (CRON_SECRET). */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Query param email required." }, { status: 400 });
  }

  const name = new URL(req.url).searchParams.get("name")?.trim() || "Test User";
  await sendWelcomePackToUser(
    { email, name, role: "user", guest: false },
    "https://getmarketintelligence.in",
  );

  return NextResponse.json({ ok: true, sentTo: email });
}
