import { cronUnauthorized } from "@/lib/api-guard";
import { getResendFromAddress } from "@/lib/admin/email";
import { sendWelcomePackWithResult } from "@/lib/onboarding/send-welcome-pack";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/cron/test-welcome?email=... — send founder welcome email (CRON_SECRET). */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Query param email required." }, { status: 400 });
  }

  const name = new URL(req.url).searchParams.get("name")?.trim() || "Test User";
  const result = await sendWelcomePackWithResult(
    { email, name, role: "user", guest: false },
    "https://getmarketintelligence.in",
  );

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
