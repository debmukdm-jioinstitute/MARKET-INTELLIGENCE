import { guardExpensive } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getBetas } from "@/lib/transmission/betas";
import { applyShocks, PRESETS, SHOCK_BOUNDS } from "@/lib/transmission/scenario";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const num = (k: keyof typeof SHOCK_BOUNDS) => z.number().finite().min(SHOCK_BOUNDS[k][0]).max(SHOCK_BOUNDS[k][1]).optional();
const Body = z.object({ shocks: z.object({ brent: num("brent"), usdinr: num("usdinr"), us10y_bp: num("us10y_bp"), spx: num("spx") }) });

export async function GET() {
  return NextResponse.json({ presets: PRESETS, bounds: SHOCK_BOUNDS });
}

/** POST {shocks} → per-sector model-implied impact. Portfolio roll-up happens client-side from the caller's own holdings. */
export async function POST(req: Request) {
  const blocked = await guardExpensive(req, { name: "scenario", flag: "scenario", max: 60, windowSec: 60 });
  if (blocked) return blocked;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid shocks", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  try {
    const betas = await getBetas();
    return NextResponse.json({ impacts: applyShocks(betas, parsed.data.shocks), computedAt: betas.computedAt, window: [betas.windowStart, betas.windowEnd], method: betas.method });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "scenario failed" }, { status: 502 });
  }
}
