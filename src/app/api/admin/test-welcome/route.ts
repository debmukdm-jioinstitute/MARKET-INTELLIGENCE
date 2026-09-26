import { requireAdmin } from "@/lib/admin/guard";
import { sendWelcomePackToUser } from "@/lib/onboarding/send-welcome-pack";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST { "email": "...", "name": "..." } — admin-only test welcome + PDF. */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email?.includes("@")) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  const name = body.name?.trim() || "Test User";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.in";

  await sendWelcomePackToUser({ email, name, role: "user", guest: false }, origin);

  return NextResponse.json({ ok: true, sentTo: email });
}
