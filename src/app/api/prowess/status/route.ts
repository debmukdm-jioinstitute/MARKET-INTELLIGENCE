import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasProwessKey } from "@/lib/prowess/client";
import { isProwessLiveBlocked } from "@/lib/prowess/auth-guard";
import { coverage } from "@/lib/prowess/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const configured = hasProwessKey();
  const cov = await coverage().catch(() => ({ stored: 0, failed: 0 }));

  if (!configured) {
    return NextResponse.json({
      live: false,
      configured: false,
      cachedReports: cov.stored,
      message: "CMIE Prowess is not configured on this deployment.",
    });
  }

  if (isProwessLiveBlocked()) {
    return NextResponse.json({
      live: false,
      configured: true,
      cachedReports: cov.stored,
      message: "Live Prowess access is temporarily unavailable (API subscription or key issue). Cached reports still load when available.",
    });
  }

  return NextResponse.json({
    live: true,
    configured: true,
    cachedReports: cov.stored,
  });
}
