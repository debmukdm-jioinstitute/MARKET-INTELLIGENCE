import { guardExpensive } from "@/lib/api-guard";
import { fetchKiteHoldings, parseZerodhaCSV } from "@/lib/brokers/zerodha";
import { zerodhaImportSchema } from "@/lib/validations/zerodha";
import type { Holding } from "@/lib/my-portfolio/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = await guardExpensive(req, { name: "import-zerodha", flag: "broker-import", max: 20, windowSec: 3600 });
  if (blocked) return blocked;
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = zerodhaImportSchema.safeParse(rawBody);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: errorMsg, issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  let holdings: Holding[] = [];

  try {
    if (data.mode === "api") {
      holdings = await fetchKiteHoldings(data.apiKey, data.accessToken);
    } else {
      holdings = parseZerodhaCSV(data.csvText);
    }

    if (holdings.length === 0) {
      return NextResponse.json(
        { error: "No active equity positions found in Zerodha response / CSV." },
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
    console.error("Zerodha import failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to import Zerodha holdings" },
      { status: data.mode === "api" ? 502 : 400 }
    );
  }
}
