/**
 * GET /api/hf/scan-explain?scanner=<id>&description=<text>
 *
 * One plain-English sentence explaining a scanner's jargon-heavy technical description (NR7,
 * PSAR, Aroon, ...), via BART summarization. Cached per scanner id for 24h in the HF client.
 */

import { NextResponse } from "next/server";
import { summarizeText } from "@/lib/hf/summarizer";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scanner = searchParams.get("scanner")?.trim();
  const description = searchParams.get("description")?.trim();
  if (!scanner || !description) {
    return NextResponse.json({ explanation: null }, { status: 400 });
  }
  try {
    const explanation = await summarizeText(description, 25);
    return NextResponse.json({ explanation });
  } catch {
    return NextResponse.json({ explanation: null });
  }
}
