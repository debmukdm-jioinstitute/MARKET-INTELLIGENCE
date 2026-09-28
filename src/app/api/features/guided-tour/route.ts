import { isFeatureEnabled } from "@/lib/api-guard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await isFeatureEnabled("guided-tour");
  return NextResponse.json({ flag: "guided-tour", enabled });
}
