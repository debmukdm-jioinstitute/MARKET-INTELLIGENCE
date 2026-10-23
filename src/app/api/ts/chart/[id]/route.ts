import { NextResponse } from "next/server";
import { buildChart } from "@/lib/ts-charts/server";
import { getChartDef } from "@/lib/ts-charts/registry";

export const dynamic = "force-dynamic";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!getChartDef(id)) return NextResponse.json({ error: "Unknown chart" }, { status: 404 });
  const u = new URL(req.url);
  const from = u.searchParams.get("from") ?? undefined;
  const to = u.searchParams.get("to") ?? undefined;
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
  try {
    const payload = await buildChart(id, from, to);
    return NextResponse.json(payload, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "chart failed" }, { status: 503 });
  }
}
