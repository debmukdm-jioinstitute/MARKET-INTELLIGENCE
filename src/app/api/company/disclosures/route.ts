import { NextRequest, NextResponse } from "next/server";
import { latestDisclosures, disclosuresMeta, saveDisclosures } from "@/lib/disclosures/store";
import { fetchNseAnnouncements } from "@/lib/disclosures/nse";
import { enrichDisclosuresWithAi } from "@/lib/disclosures/ai-enricher";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol")?.toUpperCase();
    const category = searchParams.get("category");
    const sentiment = searchParams.get("sentiment");
    const refresh = searchParams.get("refresh") === "true";
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    let items = await latestDisclosures(100);

    if (refresh) {
      try {
        const raw = await fetchNseAnnouncements();
        items = await enrichDisclosuresWithAi(raw);
        saveDisclosures(items).catch((err) =>
          console.warn("[api/company/disclosures] Background save failed:", err)
        );
      } catch (err) {
        console.warn("[api/company/disclosures] Refresh fetch failed, using cached:", err);
      }
    }

    if (symbol) {
      items = items.filter(
        (x) => x.symbol === symbol || x.companyName.toUpperCase().includes(symbol)
      );
    }

    if (category && category !== "ALL") {
      items = items.filter((x) => x.category.toUpperCase().includes(category.toUpperCase()));
    }

    if (sentiment && sentiment !== "ALL") {
      items = items.filter((x) => x.aiSentiment === sentiment);
    }

    const meta = await disclosuresMeta();

    return NextResponse.json({
      success: true,
      count: items.length,
      meta,
      disclosures: items.slice(0, limit),
    });
  } catch (error) {
    console.error("[api/company/disclosures] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve company disclosures" },
      { status: 500 }
    );
  }
}

export async function POST(_req: NextRequest) {
  try {
    const raw = await fetchNseAnnouncements();
    const enriched = await enrichDisclosuresWithAi(raw);
    const saved = await saveDisclosures(enriched);

    return NextResponse.json({
      success: true,
      crawled: raw.length,
      saved,
      latestAt: enriched[0]?.announcedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/company/disclosures] Manual sync error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
