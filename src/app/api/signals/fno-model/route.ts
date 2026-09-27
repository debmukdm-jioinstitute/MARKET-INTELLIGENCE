import { getSessionUser } from "@/lib/session";
import { loadOrBuildIndexModel } from "@/lib/scanner/fno-index-model";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET ?index=banknifty&horizon=1 — compute or load Lorentzian index model for one F&O underlying. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const indexId = sp.get("index") ?? "nifty50";
  const horizon = sp.get("horizon");

  try {
    const { run, model, indexLabel, horizon: h } = await loadOrBuildIndexModel(indexId, horizon);
    if (!model) {
      return NextResponse.json(
        { ok: false, indexLabel, horizon: h, error: "Index history insufficient or source unreachable" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, indexLabel, horizon: h, model, lastBar: run?.lastBar, asOf: run?.asOf });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
