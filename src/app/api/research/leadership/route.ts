import { after, NextResponse } from "next/server";
import { getCompanyLeadership } from "@/lib/research/company-leadership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  try {
    const data = await getCompanyLeadership(symbol, { defer: (task) => after(task) });
    // Refresh the DB-backed pay snapshot on each request; a CDN snapshot must not hide a new filing.
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Leadership data could not be checked. Please retry shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
