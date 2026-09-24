import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getSubscription, latestBriefs, setSubscription } from "@/lib/brief/store";

export const dynamic = "force-dynamic";

/** GET → latest briefs + the caller's email subscription. POST {pre, post} → set subscription (signed-in, non-guest only). */
export async function GET() {
  const user = await getSessionUser();
  const briefs = await latestBriefs(6);
  const subscription = hasDatabase() && user && !user.guest ? await getSubscription(user.email).catch(() => null) : null;
  return NextResponse.json({ briefs, subscription, canSubscribe: Boolean(user && !user.guest), dbConfigured: hasDatabase() });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) return NextResponse.json({ error: "Sign in to subscribe" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  await setSubscription(user.email, Boolean(body.pre), Boolean(body.post));
  return NextResponse.json({ ok: true });
}
