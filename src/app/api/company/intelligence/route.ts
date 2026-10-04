import { NextResponse } from "next/server";

export const revalidate = 900;

export async function GET() {
  return NextResponse.json({
    success: false,
    dataStatus: "UNAVAILABLE",
    message: "Company intelligence feed not connected",
  });
}
