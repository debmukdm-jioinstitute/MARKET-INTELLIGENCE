import { NextResponse } from "next/server";
import { INSTITUTIONAL_BROKER_SOURCES } from "@/lib/broker-research/database";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    totalSources: INSTITUTIONAL_BROKER_SOURCES.length,
    sources: INSTITUTIONAL_BROKER_SOURCES,
  });
}
