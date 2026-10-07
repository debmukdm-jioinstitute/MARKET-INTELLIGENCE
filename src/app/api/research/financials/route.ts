import { getCompanyFinancials } from "@/lib/financials/service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  }

  try {
    const payload = await getCompanyFinancials(symbol);
    if (!payload) {
      return NextResponse.json({ error: `No financial statements found for ${symbol}` }, { status: 404 });
    }
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load company financials" },
      { status: 500 },
    );
  }
}
