import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: false, disabled: true, message: "CMIE Prowess data has been removed." });
}

export async function POST() {
  return NextResponse.json({ error: "CMIE Prowess data has been removed." }, { status: 410 });
}
