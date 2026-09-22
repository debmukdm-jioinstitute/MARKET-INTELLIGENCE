import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** The full NSE F&O-eligible stock list for the watchlist picker/search — not a hardcoded 18 names. */
export async function GET() {
  const instruments = await listFoUniverse();
  return NextResponse.json({ instruments });
}
