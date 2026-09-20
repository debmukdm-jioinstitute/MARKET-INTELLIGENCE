import { fetchUpstoxHoldings, parseUpstoxCSV } from "@/lib/brokers/upstox";
import { upstoxImportSchema } from "@/lib/validations/upstox-broker";
import type { Holding } from "@/lib/my-portfolio/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = upstoxImportSchema.safeParse(rawBody);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: errorMsg, issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  let holdings: Holding[] = [];

  try {
    if (data.mode === "api") {
      holdings = await fetchUpstoxHoldings(data.accessToken);
    } else {
      holdings = parseUpstoxCSV(data.csvText);
    }

    if (holdings.length === 0) {
      return NextResponse.json(
        { error: "No active equity positions found in Upstox response / CSV." },
        { status: 404 }
      );
    }

    const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);

    return NextResponse.json({
      success: true,
      holdings,
      totalPositions: holdings.length,
      totalInvested: Math.round(totalInvested * 100) / 100,
    });
  } catch (err) {
    console.error("Upstox import failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to import Upstox holdings" },
      { status: data.mode === "api" ? 502 : 400 }
    );
  }
}
