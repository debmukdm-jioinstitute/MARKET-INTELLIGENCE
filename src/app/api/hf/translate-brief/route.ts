/**
 * GET /api/hf/translate-brief?briefId=<id>&headline=...&items=<json>&watch=<json>
 *
 * Translates the Daily Brief's headline, item texts, and watch list to Hindi
 * (Helsinki-NLP/opus-mt-en-hi). Cached per brief id for a day — the brief itself only changes
 * twice a day, so this route's own cache (on top of the HF client's per-string cache) avoids
 * re-requesting the same day's brief translation repeatedly.
 */

import { NextResponse } from "next/server";
import { translateManyToHindi } from "@/lib/hf/translate";

export const runtime = "nodejs";

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: { headline: string; items: string[]; watch: string[] } }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const briefId = searchParams.get("briefId") ?? "";
  const headline = searchParams.get("headline") ?? "";
  const items = JSON.parse(searchParams.get("items") ?? "[]") as string[];
  const watch = JSON.parse(searchParams.get("watch") ?? "[]") as string[];

  if (!briefId) return NextResponse.json({ error: "briefId required" }, { status: 400 });

  const key = `${briefId}::${new Date().toISOString().slice(0, 10)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.data);

  try {
    const [headlineHi, itemsHi, watchHi] = await Promise.all([
      translateManyToHindi([headline]).then((r) => r[0] ?? headline),
      translateManyToHindi(items),
      translateManyToHindi(watch),
    ]);
    const data = { headline: headlineHi, items: itemsHi, watch: watchHi };
    cache.set(key, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    // Graceful degradation: return the English text back unchanged rather than an error.
    return NextResponse.json({ headline, items, watch });
  }
}
