/**
 * GET /api/hf/similar-stocks?symbol=RELIANCE&limit=5
 *
 * Uses sentence-transformers/all-MiniLM-L6-v2 to find stocks with semantically
 * similar business descriptions to the requested symbol.
 *
 * Data source: The site's own UNIVERSE list (universe.ts) with sector & name.
 * This is purely semantic — based on text similarity of company descriptions.
 */

import { embedTexts, cosineSimilarity } from "@/lib/hf/embeddings";
import { UNIVERSE } from "@/lib/universe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Build a description snippet for each stock in UNIVERSE
function stockDescription(u: (typeof UNIVERSE)[number]): string {
  return `${u.name} (${u.symbol}) - ${u.sector ?? "Unknown sector"}`;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "5"), 10);

  if (!symbol) return NextResponse.json({ error: "symbol param required" }, { status: 400 });

  const target = UNIVERSE.find((u) => u.symbol === symbol);
  if (!target) {
    return NextResponse.json({ error: `${symbol} not found in universe` }, { status: 404 });
  }

  const candidates = UNIVERSE.filter((u) => u.symbol !== symbol);
  const queryText = stockDescription(target);
  const candidateTexts = candidates.map(stockDescription);

  try {
    const allTexts = [queryText, ...candidateTexts];
    const embeddings = await embedTexts(allTexts);

    const queryEmb = embeddings[0]!;
    const scored = candidates.map((u, i) => ({
      symbol: u.symbol,
      name: u.name,
      sector: u.sector ?? null,
      similarity: cosineSimilarity(queryEmb, embeddings[i + 1]!),
    }));

    const top = scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((s) => ({ ...s, similarity: Math.round(s.similarity * 1000) / 1000 }));

    return NextResponse.json({
      symbol,
      name: target.name,
      similar: top,
      model: "sentence-transformers/all-MiniLM-L6-v2",
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embedding failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
