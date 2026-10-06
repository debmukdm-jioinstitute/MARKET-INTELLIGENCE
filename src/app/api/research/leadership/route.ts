import { NextResponse } from "next/server";
import { getCompanyLeadership } from "@/lib/research/company-leadership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  try {
    const data = await getCompanyLeadership(symbol);
    const rich = Boolean(data.pay || data.holdings || data.dividends || data.people.length);
    return NextResponse.json(data, { headers: { "Cache-Control": rich ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store" } });
  } catch {
    return NextResponse.json({ error: "Leadership data could not be checked. Please retry shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
