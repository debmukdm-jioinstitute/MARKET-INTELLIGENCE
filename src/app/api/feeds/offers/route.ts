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
  const force =
    url.searchParams.get("refresh") === "true" ||
    url.searchParams.get("force") === "true" ||
    req.headers.get("cache-control")?.includes("no-cache") === true;
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

  const report = await fetchChittorgarhOfferReport(category, year, force);

  const cacheHeader = force
    ? "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    : category === "ncd-subscription"
      ? "public, max-age=10, s-maxage=30, stale-while-revalidate=60"
      : "public, max-age=30, s-maxage=60, stale-while-revalidate=120";

  return NextResponse.json(report, {
    headers: {
      "Cache-Control": cacheHeader,
      "x-data-freshness": force ? "fresh-forced" : "live-polled",
      "x-last-scraped": report.source.asOf,
    },
  });
}
