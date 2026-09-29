import {
  CHITTORGARH_OFFER_REPORTS,
  fetchChittorgarhOfferReport,
} from "@/lib/feeds/sources/chittorgarh-report-api";
import type { OfferCategory } from "@/lib/feeds/offers/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CATEGORIES = Object.keys(CHITTORGARH_OFFER_REPORTS) as OfferCategory[];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = (url.searchParams.get("category") ?? "ncd") as OfferCategory;
  const yearRaw = url.searchParams.get("year");
  const year = yearRaw ? Number(yearRaw) : new Date().getFullYear();

  if (!CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Use one of: ${CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }
  if (!Number.isFinite(year) || year < 2015 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const report = await fetchChittorgarhOfferReport(category, year);
  return NextResponse.json(report, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" },
  });
}
