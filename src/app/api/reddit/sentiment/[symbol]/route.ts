import { NextResponse } from "next/server";
import { getCompanyRetailSentiment } from "@/lib/reddit-sentiment/database";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ symbol: string }>;
};

export async function GET(req: Request, { params }: Props) {
  try {
    const { symbol: rawSymbol } = await params;
    const symbol = decodeURIComponent(rawSymbol).toUpperCase();
    const sentiment = getCompanyRetailSentiment(symbol);

    return NextResponse.json({
      success: true,
      sentiment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch company sentiment",
      },
      { status: 500 }
    );
  }
}
