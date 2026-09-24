import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { isReportId } from "@/lib/prowess/reports";
import { putStored, stateMap } from "@/lib/prowess/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYMBOLS = new Set(NIFTY_500.map((r) => r[0]));

function authorized(req: Request): boolean {
  const secret = process.env.PROWESS_INGEST_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * Push-based ingest for Prowess reports. CMIE only accepts the API key from its registered IP, so a machine on that IP
 * (scripts/prowess-sync.ts) fetches from CMIE and POSTs the results here; this route writes them to the site's store.
 *  GET  → {fetched: {"SYMBOL|report": epochMs}} so the runner can resume.
 *  POST {items: [{symbol, report, data}]}
 */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fetched } = await stateMap();
  return NextResponse.json({ fetched: Object.fromEntries(fetched) });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const items: unknown[] = Array.isArray(body?.items) ? body.items : [];
  let stored = 0;
  const rejected: string[] = [];
  for (const it of items.slice(0, 50)) {
    const { symbol, report, data } = (it ?? {}) as { symbol?: string; report?: string; data?: { meta?: unknown } };
    if (typeof symbol !== "string" || !SYMBOLS.has(symbol) || !isReportId(report) || !data?.meta) {
      rejected.push(`${symbol}/${report}`);
      continue;
    }
    await putStored(symbol, report, data);
    stored++;
  }
  return NextResponse.json({ stored, rejected });
}
