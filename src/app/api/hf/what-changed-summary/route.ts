/**
 * GET /api/hf/what-changed-summary
 *
 * One-line BART summary per "What changed?" card, server-side, cached 6h (via HF client TTL
 * plus this route's own in-process cache keyed by the item id + a short hash of its data).
 */

import { NextResponse } from "next/server";
import { getMarketShiftsCached } from "@/lib/feeds/what-changed/cache";
import { summarizeText } from "@/lib/hf/summarizer";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: Record<string, string> }>();

export async function GET() {
  try {
    const shifts = await getMarketShiftsCached();
    const key = shifts.items.map((i) => i.id).join(",");
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return NextResponse.json({ summaries: hit.data, asOf: new Date().toISOString() });
    }

    const entries = await Promise.all(
      shifts.items.map(async (item) => {
        try {
          const oneLiner = await summarizeText(item.dataSummary, 20);
          return [item.id, oneLiner] as const;
        } catch {
          return null;
        }
      }),
    );
    const summaries: Record<string, string> = {};
    for (const e of entries) if (e) summaries[e[0]] = e[1];
    cache.set(key, { at: Date.now(), data: summaries });

    return NextResponse.json({ summaries, asOf: new Date().toISOString() });
  } catch {
    return NextResponse.json({ summaries: {}, asOf: new Date().toISOString() });
  }
}
