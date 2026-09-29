import { NextResponse } from "next/server";
import { getCompanyIntelligenceProfile } from "@/lib/company-intelligence/database";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ symbol: string }>;
};

export async function GET(req: Request, { params }: Props) {
  try {
    const { symbol: rawSymbol } = await params;
    const symbol = decodeURIComponent(rawSymbol).toUpperCase();
    const profile = getCompanyIntelligenceProfile(symbol);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch company intelligence",
      },
      { status: 500 }
    );
  }
}
