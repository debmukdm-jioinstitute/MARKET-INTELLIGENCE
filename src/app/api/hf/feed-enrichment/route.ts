/**
 * GET /api/hf/feed-enrichment
 *
 * FinBERT sentiment + zero-shot category per /intelligence feed headline, batched at fetch time
 * and cached 30 min (see src/lib/hf/feed-enrichment.ts). Always returns 200 — an empty enrichment
 * map on failure, never an error the client has to special-case.
 */

import { NextResponse } from "next/server";
import { buildFeedHub } from "@/lib/feeds/hub";
import { enrichFeedHeadlines } from "@/lib/hf/feed-enrichment";

export const runtime = "nodejs";
// Live AI inference must never be prerendered at build time — the HF client's
// internal 30-min cache still governs upstream calls.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hub = await buildFeedHub();
    const items = (hub.news ?? []).slice(0, 24).map((n) => ({ id: n.id, title: n.title }));
    const enrichment = await enrichFeedHeadlines(items);
    return NextResponse.json({ enrichment, asOf: new Date().toISOString() });
  } catch {
    return NextResponse.json({ enrichment: {}, asOf: new Date().toISOString() });
  }
}
