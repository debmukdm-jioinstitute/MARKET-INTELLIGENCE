import { AiKeyMissingError } from "@/lib/ai/llm";
import { runSentimentPortfolio } from "@/lib/ai/sentiment-portfolio";
import { getSessionEmail } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const email = await getSessionEmail();
    const result = await runSentimentPortfolio(email);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sentiment analysis failed" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const email = await getSessionEmail();
    const body = (await req.json().catch(() => ({}))) as { holdings?: import("@/lib/ai/sentiment-portfolio").HoldingRow[] };
    const result = await runSentimentPortfolio(email, Array.isArray(body?.holdings) ? body.holdings : undefined);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sentiment analysis failed" },
      { status: 502 },
    );
  }
}
