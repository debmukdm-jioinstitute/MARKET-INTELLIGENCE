import { NextResponse } from "next/server";

// Institutional accumulation radar is unavailable: it was previously computed
// from hardcoded portfolio figures that were not real disclosure data, and no
// verified AMC portfolio feed is ingested yet.
export async function GET() {
  return NextResponse.json({
    dataStatus: "UNAVAILABLE",
    message:
      "Institutional accumulation radar is unavailable — fund portfolio disclosures are not yet ingested from a verified source.",
  });
}
