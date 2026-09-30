/**
 * POST /api/hf/classify
 *
 * Body: { headlines: string[] }  — up to 10 headlines
 * Returns: ClassifiedNews[]
 *
 * Uses facebook/bart-large-mnli (zero-shot) to categorize news headlines
 * into finance domains like earnings, monetary-policy, ipo, etc.
 */

import { classifyNewsHeadlines } from "@/lib/hf/news-classifier";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  headlines: z.array(z.string().min(1).max(500)).min(1).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const results = await classifyNewsHeadlines(body.headlines);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
