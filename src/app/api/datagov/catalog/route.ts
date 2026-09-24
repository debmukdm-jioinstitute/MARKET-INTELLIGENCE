import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/datagov/client";

export const dynamic = "force-dynamic";

/** GET /api/datagov/catalog?q=&sector=&org=&offset=&limit= — live search across data.gov.in's full catalog. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  try {
    const out = await searchCatalog({
      title: sp.get("q") ?? undefined,
      sector: sp.get("sector") ?? undefined,
      org: sp.get("org") ?? undefined,
      offset: Number(sp.get("offset") ?? 0) || 0,
      limit: Math.min(Number(sp.get("limit") ?? 25) || 25, 100),
    });
    return NextResponse.json(out, { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=3600" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "catalog failed" }, { status: 502 });
  }
}
