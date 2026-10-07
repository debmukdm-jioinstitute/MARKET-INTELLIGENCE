import { NextResponse } from "next/server";
import {
  getIndexConstituents,
  type ConstituentsResponse,
  type IndexConstituent,
} from "@/lib/india-index-constituents";

export const revalidate = 300;
export const maxDuration = 60;

// Re-exported for the frontend panel's types.
export type { ConstituentsResponse, IndexConstituent };

const CACHE_HEADERS = { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" };

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await ctx.params;
  const { status, body } = await getIndexConstituents(rawSlug ?? "");
  return NextResponse.json(body, { status, headers: CACHE_HEADERS });
}
