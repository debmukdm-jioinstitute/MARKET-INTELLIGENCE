import { requireAdmin } from "@/lib/admin/guard";
import { answerFromKnowledgeBase } from "@/lib/admin/rag";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const question = String(body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });

  try {
    const result = await answerFromKnowledgeBase(question);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to answer" }, { status: 502 });
  }
}
