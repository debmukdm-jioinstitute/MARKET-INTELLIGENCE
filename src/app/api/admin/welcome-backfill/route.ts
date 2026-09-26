import { requireAdmin } from "@/lib/admin/guard";
import { previewWelcomeBackfill, runWelcomeBackfillChunk } from "@/lib/onboarding/welcome-backfill";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin only. GET -> dry run (counts and masked sample, sends nothing).
 * POST {"confirm": true, "limit": 20} -> sends the welcome pack to the next chunk of members who never received it.
 */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  return NextResponse.json(await previewWelcomeBackfill());
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const body = await req.json().catch(() => null);
  if (body?.confirm !== true) return NextResponse.json({ error: 'Send requires {"confirm": true}. Use GET for a dry run.' }, { status: 400 });
  const limit = Number.isFinite(Number(body.limit)) ? Number(body.limit) : 20;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return NextResponse.json(await runWelcomeBackfillChunk(limit, origin));
}
