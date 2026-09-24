import { NextResponse } from "next/server";
import { hasProwessKey } from "@/lib/prowess/client";
import { isReportId } from "@/lib/prowess/reports";
import { coverage } from "@/lib/prowess/store";
import { syncProwess } from "@/lib/prowess/sync";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { REPORT_IDS } from "@/lib/prowess/reports";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron: fetch the stalest Prowess reports for the Nifty 500 (resumable, time-boxed).
 * Optional ?symbols=INFY,TCS&reports=stock,profile for targeted runs; ?status=1 for coverage only.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasProwessKey()) return NextResponse.json({ ok: false, error: "PROWESS_API_KEY not set" }, { status: 503 });
  const sp = new URL(req.url).searchParams;
  const total = NIFTY_500.length * REPORT_IDS.length;
  if (sp.get("status")) return NextResponse.json({ total, ...(await coverage()) });

  const symbols = sp.get("symbols")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const reports = sp.get("reports")?.split(",").filter(isReportId);
  try {
    return NextResponse.json({ ok: true, total, ...(await syncProwess({ symbols, reports })) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
