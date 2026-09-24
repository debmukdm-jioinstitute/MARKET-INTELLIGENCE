import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { createRule, deleteRule, listRules, recentEvents, RuleInput, setRuleActive } from "@/lib/alerts/store";
import { getSessionUser } from "@/lib/session";
import { buildSnapshot, METRICS } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function requireUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

/** GET → metric catalog with current values, plus the caller's rules and recent events. */
export async function GET() {
  const snap = await buildSnapshot().catch(() => null);
  const catalog = Object.entries(METRICS).map(([id, m]) => ({ id, ...m, current: snap?.metrics[id as keyof typeof METRICS] ?? null }));
  const user = await requireUser();
  if (!user || !hasDatabase()) return NextResponse.json({ catalog, rules: [], events: [], canEdit: false, dbConfigured: hasDatabase() });
  const [rules, events] = await Promise.all([listRules(user.email), recentEvents(user.email)]);
  return NextResponse.json({ catalog, rules, events, canEdit: true, dbConfigured: true });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to create alert rules" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  const parsed = RuleInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid rule", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  try {
    return NextResponse.json({ rule: await createRule(user.email, parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || typeof body.active !== "boolean") return NextResponse.json({ error: "id and active required" }, { status: 400 });
  await setRuleActive(user.email, body.id, body.active);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteRule(user.email, id);
  return NextResponse.json({ ok: true });
}
