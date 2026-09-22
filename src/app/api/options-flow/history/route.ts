import { hasDatabase } from "@/lib/db";
import { listOptionsFlowFlagLog } from "@/lib/options-flow/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Doc: "Track your flags. Log every one, and note what actually happened over the following two weeks." */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ flags: [], dbConfigured: false });
  const flags = await listOptionsFlowFlagLog(60);
  return NextResponse.json({ flags, dbConfigured: true });
}
