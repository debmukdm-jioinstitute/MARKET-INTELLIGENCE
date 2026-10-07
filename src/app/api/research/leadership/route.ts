import { after, NextResponse } from "next/server";
import { cachedSWR } from "@/lib/cache/redis";
import { getCompanyLeadership } from "@/lib/research/company-leadership";
import { panelCacheKey } from "@/lib/research/panel-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  try {
    const { value: data, cache } = await cachedSWR(
      panelCacheKey("leadership", symbol),
      {
        freshMs: 6 * 60 * 60_000,
        ttlSec: 7 * 24 * 60 * 60,
        shouldCache: (d) => Boolean(d.pay || d.holdings || d.dividends || d.people.length),
      },
      () => getCompanyLeadership(symbol),
      (task) => after(task),
    );
    if (!data) throw new Error("no data");
    const rich = Boolean(data.pay || data.holdings || data.dividends || data.people.length);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": rich ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store",
        "x-mi-cache": cache,
      },
    });
  } catch {
    return NextResponse.json({ error: "Leadership data could not be checked. Please retry shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
