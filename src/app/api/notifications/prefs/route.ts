import { NextResponse } from "next/server";
import { savePushPrefs } from "@/lib/notify/store";

export const dynamic = "force-dynamic";

const CATEGORIES = ["market", "macro", "scanner", "ai", "brief", "data"];

/** POST {endpoint, muted: string[]} — stores which categories a subscribed device does not want pushed. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const muted = Array.isArray(body?.muted) ? body.muted.filter((c: unknown): c is string => typeof c === "string" && CATEGORIES.includes(c)) : null;
  if (!endpoint || !muted) return NextResponse.json({ error: "endpoint and muted[] required" }, { status: 400 });
  const ok = await savePushPrefs(endpoint, muted);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
