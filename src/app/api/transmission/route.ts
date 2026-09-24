import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/snapshot";
import { getBetas } from "@/lib/transmission/betas";
import { applyShocks, type Shocks } from "@/lib/transmission/scenario";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET → betas + today's observed factor moves and the sector moves they'd imply. */
export async function GET() {
  try {
    const [betas, snap] = await Promise.all([getBetas(), buildSnapshot().catch(() => null)]);
    let today: { shocks: Shocks; implied: ReturnType<typeof applyShocks> } | null = null;
    if (snap) {
      const d = snap.dashboard;
      const pct = (v: number | null | undefined) => (v == null ? undefined : v * 100);
      const shocks: Shocks = {
        brent: pct(d.pulse.brent.changePct),
        usdinr: pct(d.pulse.usdInr.changePct),
        us10y_bp: d.globalRadar.us10y?.change != null ? d.globalRadar.us10y.change * 100 : undefined,
        spx: pct(d.globalRadar.sp500?.changePct),
      };
      today = { shocks, implied: applyShocks(betas, shocks) };
    }
    return NextResponse.json({ betas, today }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "transmission failed" }, { status: 502 });
  }
}
