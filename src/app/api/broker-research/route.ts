import { NextResponse } from "next/server";
import {
  getAllBrokerResearchReports,
  getCompanyConsensusIntelligence,
} from "@/lib/broker-research/database";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const broker = searchParams.get("broker");
    const rating = searchParams.get("rating");

    if (symbol) {
      const consensus = getCompanyConsensusIntelligence(symbol);
      let reports = consensus.brokerMatrix;

      if (broker) {
        reports = reports.filter((r) => r.broker.toLowerCase() === broker.toLowerCase());
      }
      if (rating) {
        reports = reports.filter((r) => r.rating.toLowerCase() === rating.toLowerCase());
      }

      return NextResponse.json({
        success: true,
        consensus,
        reports,
      });
    }

    let allReports = getAllBrokerResearchReports();
    if (broker) {
      allReports = allReports.filter((r) => r.broker.toLowerCase() === broker.toLowerCase());
    }
    if (rating) {
      allReports = allReports.filter((r) => r.rating.toLowerCase() === rating.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      count: allReports.length,
      reports: allReports,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch broker research",
      },
      { status: 500 }
    );
  }
}
