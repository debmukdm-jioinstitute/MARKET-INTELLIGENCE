import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "CMIE Prowess ingest is disabled." }, { status: 410 });
}
