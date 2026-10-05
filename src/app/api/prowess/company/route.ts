import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json({ status: "disabled", error: "CMIE Prowess data has been removed." }, { status: 410 });
}
