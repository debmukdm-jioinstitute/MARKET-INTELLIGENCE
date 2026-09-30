/**
 * POST /api/hf/sentiment
 *
 * Body: { texts: string[] }   — up to 5 strings
 * Returns: FinBertResult[]
 *
 * Uses ProsusAI/finbert for finance-domain sentiment classification.
 * All HF calls go server-side; HF_TOKEN is never exposed to the browser.
 */

import { classifyFinancialSentiment } from "@/lib/hf/finbert";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  texts: z.array(z.string().min(1).max(2000)).min(1).max(5),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const results = await classifyFinancialSentiment(body.texts);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("HfApiError") ? 502 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text");
  if (!text) return NextResponse.json({ error: "text param required" }, { status: 400 });
  try {
    const results = await classifyFinancialSentiment([text]);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
