import { logAssistantAction, recentAssistantActions } from "@/lib/site-assistant/audit";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** GET → the signed-in user's recent Ask Deb actions, newest first. Shown in Settings. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.guest) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ actions: await recentAssistantActions(user.email) });
}

const LogInput = z.object({
  tool: z.string().min(1).max(64),
  params: z.record(z.string(), z.unknown()).default({}),
  summary: z.string().min(1).max(500),
  ok: z.boolean(),
});

/**
 * POST → record one assistant-executed action. Write tools run client-side (through the same
 * hooks the portal UI uses, so localStorage and the server stay in sync), so the client reports
 * back here for the audit trail rather than the tool call itself writing the log.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = LogInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid audit entry" }, { status: 400 });
  await logAssistantAction({ email: user.email, ...parsed.data });
  return NextResponse.json({ ok: true });
}
