import { fetchMassiveMarketStatus, hasMassiveApiKey, MASSIVE_SOURCE } from "@/lib/feeds/sources/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasMassiveApiKey()) {
    return NextResponse.json(
      {
        configured: false,
        message:
          "Set MASSIVE_API_KEY (or POLYGON_API_KEY) on Vercel Production, then redeploy — https://massive.com/dashboard/keys",
        signup: "https://massive.com/dashboard/signup",
        docs: MASSIVE_SOURCE.url,
      },
      { status: 200 },
    );
  }
  try {
    const status = await fetchMassiveMarketStatus();
    return NextResponse.json({
      configured: true,
      source: MASSIVE_SOURCE,
      status,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { configured: true, error: e instanceof Error ? e.message : "Massive status failed" },
      { status: 502 },
    );
  }
}
