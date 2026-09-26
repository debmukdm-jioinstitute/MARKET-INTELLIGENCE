import { requireAdmin } from "@/lib/admin/guard";
import { getResendFromAddress } from "@/lib/admin/email";
import { sendWelcomePackWithResult } from "@/lib/onboarding/send-welcome-pack";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST { "email": "...", "name": "..." } — admin-only test welcome + PDF. */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

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

  const result = await sendWelcomePackWithResult({ email, name, role: "user", guest: false }, origin);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Resend rejected the send.", from: result.from ?? getResendFromAddress() },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sentTo: email,
    from: result.from ?? getResendFromAddress(),
    resendId: result.resendId,
    pdfAttached: result.pdfAttached,
    pdfSkipReason: result.pdfSkipReason,
  });
}
