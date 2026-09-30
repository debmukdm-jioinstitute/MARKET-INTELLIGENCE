/**
 * POST /api/hf/summarize
 *
 * Body: { text: string, maxWords?: number }
 * Returns: { summary: string }
 *
 * Uses facebook/bart-large-cnn to produce a plain-English TL;DR
 * of financial text (news snippets, research items, earnings commentary).
 */

import { summarizeText } from "@/lib/hf/summarizer";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  text: z.string().min(20).max(5000),
  maxWords: z.number().int().min(20).max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const summary = await summarizeText(body.text, body.maxWords);
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text");
  if (!text) return NextResponse.json({ error: "text param required" }, { status: 400 });
  const maxWords = Number(req.nextUrl.searchParams.get("maxWords") ?? "80");
  try {
    const summary = await summarizeText(text, maxWords);
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
