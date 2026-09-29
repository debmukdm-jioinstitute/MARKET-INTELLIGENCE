import { guardExpensive } from "@/lib/api-guard";
import { AiKeyMissingError } from "@/lib/ai/llm";
import { buildIpoAnalystMemo } from "@/lib/feeds/ipo/analyst-memo";
import { resolveIpoDetail } from "@/lib/feeds/ipo/resolve-detail";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guardExpensive(req, { name: "ai-ipo-analyst", flag: "ai", max: 6, windowSec: 3600 });
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { ipoId?: string };
  const ipoId = typeof body.ipoId === "string" ? body.ipoId.trim() : "";
  if (!ipoId || ipoId.length > 80) {
    return NextResponse.json({ error: "ipoId is required" }, { status: 400 });
  }

  try {
    const detail = await resolveIpoDetail(ipoId);
    if (!detail) return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    const memo = await buildIpoAnalystMemo(detail);
    return NextResponse.json(memo, { headers: { "Cache-Control": "private, max-age=120" } });
  } catch (e) {
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "IPO analyst memo failed" },
      { status: 502 },
    );
  }
}
