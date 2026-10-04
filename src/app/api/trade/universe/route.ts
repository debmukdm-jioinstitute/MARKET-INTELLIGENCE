import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { INDEX_INSTRUMENTS } from "@/lib/trade-lab/data";
import { NextResponse } from "next/server";

export const revalidate = 900;

/** GET → index cards + the NSE F&O stock universe (from the weekly Upstox instrument-master sync). */
export async function GET() {
  const fo = await listFoUniverse().catch(() => []);
  return NextResponse.json(
    {
      indices: INDEX_INSTRUMENTS.map((i) => ({ id: i.id, label: i.label })),
      stocks: fo.map((s) => ({ symbol: s.symbol, name: s.name })),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
