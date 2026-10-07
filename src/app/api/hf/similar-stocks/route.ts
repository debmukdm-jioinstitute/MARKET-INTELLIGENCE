/**
 * GET /api/hf/similar-stocks?symbol=RELIANCE&limit=5
 *
 * Uses sentence-transformers/all-MiniLM-L6-v2 to find stocks with semantically
 * similar business descriptions to the requested symbol.
 *
 * Data source: the site's UNIVERSE list (universe.ts, US/global) and, for Indian
 * tickers, Nifty 500 peers in the same NSE industry (prowess/nifty500.ts).
 * Results are cached in Redis for 7 days (no-op when Redis is not configured).
 */

import { cachedSWR } from "@/lib/cache/redis";
import { embedTexts, cosineSimilarity } from "@/lib/hf/embeddings";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { UNIVERSE } from "@/lib/universe";
import { after, NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Candidate = { symbol: string; name: string; sector: string | null };
type SimilarPayload = {
  symbol: string;
  name: string;
  similar: (Candidate & { similarity: number })[];
  model: string;
  asOf: string;
};

/** Max same-industry Indian peers scored per request (embedTexts takes 10 texts per call). */
const MAX_IN_CANDIDATES = 29;

const describe = (c: Candidate) => `${c.name} (${c.symbol}) - ${c.sector ?? "Unknown sector"}`;

/** embedTexts() embeds at most 10 texts per call; batch so every candidate gets a vector. */
async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 10) out.push(...(await embedTexts(texts.slice(i, i + 10))));
  return out;
}

function findUniverse(symbol: string): { target: Candidate; candidates: Candidate[] } | null {
  const t = UNIVERSE.find((u) => u.symbol === symbol);
  if (!t) return null;
  return {
    target: { symbol: t.symbol, name: t.name, sector: t.sector ?? null },
    candidates: UNIVERSE.filter((u) => u.symbol !== symbol).map((u) => ({ symbol: u.symbol, name: u.name, sector: u.sector ?? null })),
  };
}

function findNifty500(symbol: string): { target: Candidate; candidates: Candidate[] } | null {
  const t = NIFTY_500.find(([s]) => s === symbol);
  if (!t) return null;
  const [, name, industry] = t;
  const peers = NIFTY_500.filter(([s, , ind]) => ind === industry && s !== symbol && !s.startsWith("DUMMY"))
    .slice(0, MAX_IN_CANDIDATES)
    .map(([s, n, ind]) => ({ symbol: s, name: n, sector: ind }));
  return { target: { symbol, name, sector: industry }, candidates: peers };
}

async function rank(target: Candidate, candidates: Candidate[], limit: number): Promise<SimilarPayload | null> {
  if (!candidates.length) return null;
  const embeddings = await embedAll([describe(target), ...candidates.map(describe)]);
  const queryEmb = embeddings[0];
  if (!queryEmb) return null;
  const similar = candidates
    .map((c, i) => ({ ...c, similarity: cosineSimilarity(queryEmb, embeddings[i + 1] ?? []) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((s) => ({ ...s, similarity: Math.round(s.similarity * 1000) / 1000 }));
  return { symbol: target.symbol, name: target.name, similar, model: "sentence-transformers/all-MiniLM-L6-v2", asOf: new Date().toISOString() };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "5") || 5, 10));

  if (!symbol) return NextResponse.json({ error: "symbol param required" }, { status: 400 });

  const found = findUniverse(symbol) ?? findNifty500(symbol);
  if (!found) {
    return NextResponse.json({ error: `${symbol} not found in universe` }, { status: 404 });
  }

  try {
    const { value } = await cachedSWR<SimilarPayload>(
      `similar:v1:${symbol}:${limit}`,
      { freshMs: 24 * 60 * 60_000, ttlSec: 7 * 24 * 60 * 60 },
      () => rank(found.target, found.candidates, limit),
      (task) => after(task),
    );
    if (!value) return NextResponse.json({ error: `No peers found for ${symbol}` }, { status: 404 });
    return NextResponse.json(value, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embedding failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
