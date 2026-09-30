import { NextResponse } from "next/server";

// Fund overlap is unavailable: it was previously computed from hardcoded
// portfolio figures that were not real disclosure data, and no verified
// AMC portfolio feed is ingested yet.
export async function GET() {
  return NextResponse.json({
    dataStatus: "UNAVAILABLE",
    message:
      "Fund overlap is unavailable — fund portfolio disclosures are not yet ingested from a verified source.",
  });
}
