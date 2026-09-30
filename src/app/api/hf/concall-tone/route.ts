/**
 * GET /api/hf/concall-tone?symbol=<symbol>
 *
 * UNAVAILABLE: there is no verified concall transcript feed connected, so there is no
 * authentic text to score. Running inference on invented concall summaries would produce
 * "AI scores" for fictional content — we don't do that.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    dataStatus: "UNAVAILABLE",
    message: "No verified concall transcript feed",
    points: [],
  });
}
