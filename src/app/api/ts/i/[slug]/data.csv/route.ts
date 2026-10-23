import { NextResponse } from "next/server";
import { buildChart } from "@/lib/ts-charts/server";
import { getChartDef } from "@/lib/ts-charts/registry";

export const dynamic = "force-dynamic";

/** slug = registry id without the "i." prefix, e.g. nifty50_pe → i.nifty50_pe. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const id = `i.${slug}`;
  const def = getChartDef(id);
  if (!def || def.kind !== "indicator") return NextResponse.json({ error: "Unknown indicator" }, { status: 404 });
  const p = await buildChart(id).catch(() => null);
  if (!p) return NextResponse.json({ error: "Data unavailable" }, { status: 503 });
  const col = def.series[0].col;
  const body = ["date,value", ...p.rows.filter((r) => r[col] != null).map((r) => `${r.date},${r[col]}`)].join("\n") + "\n";
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}.csv"`, "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
}
