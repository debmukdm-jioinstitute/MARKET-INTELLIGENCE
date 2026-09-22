import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { runDataAgentAndSave } from "@/lib/options-flow/run";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily cron — Data Agent only, for the whole curated F&O universe, so a 30-day baseline accumulates even on days nobody opens the screener. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const symbols = INDIA_EQUITIES.map((i) => i.symbol);
  const results = await runDataAgentAndSave(symbols);
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
