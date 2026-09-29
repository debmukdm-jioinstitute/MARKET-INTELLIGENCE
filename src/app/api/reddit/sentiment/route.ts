import { NextResponse } from "next/server";
import {
  getAllRetailSentimentData,
  getCompanyRetailSentiment,
} from "@/lib/reddit-sentiment/database";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (symbol) {
      const companySentiment = getCompanyRetailSentiment(symbol);
      return NextResponse.json({
        success: true,
        companySentiment,
      });
    }

    const data = getAllRetailSentimentData();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch retail sentiment data",
      },
      { status: 500 }
    );
  }
}
