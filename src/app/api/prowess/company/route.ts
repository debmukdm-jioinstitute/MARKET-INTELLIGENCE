import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getReport, hasProwessKey } from "@/lib/prowess/client";
import { blockProwessLive, isProwessAuthError, isProwessLiveBlocked } from "@/lib/prowess/auth-guard";
import { loadBatch } from "@/lib/prowess/batches";
import { resolveProwessCompany } from "@/lib/prowess/resolve-company";
import { REPORTS, isReportId } from "@/lib/prowess/reports";
import { getStored, putError, putStored } from "@/lib/prowess/store";

export const dynamic = "force-dynamic";

/**
 * GET ?company=<NSE symbol | name | CIN | CMIE code>&report=<report id>
 * Serves the stored copy (filled by /api/cron/prowess) when fresh; otherwise fetches live and stores it.
 * → {status:"ok", data, fetchedAt, source} | {status:"not_configured"|"error", ...}. Key stays server-side.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company")?.trim();
  const report = searchParams.get("report");
  if (!company || !isReportId(report)) {
    return NextResponse.json({ error: `company and report=${Object.keys(REPORTS).join("|")} required` }, { status: 400 });
  }

  const cfg = REPORTS[report];
  const stored = await getStored(company, report).catch(() => null);
  if (stored && Date.now() - stored.fetchedAt.getTime() < cfg.ttlHours * 3600 * 1000) {
    return NextResponse.json({ status: "ok", data: stored.data, fetchedAt: stored.fetchedAt, source: "store" });
  }
  if (!hasProwessKey()) {
    return stored
      ? NextResponse.json({ status: "ok", data: stored.data, fetchedAt: stored.fetchedAt, source: "store-stale" })
      : NextResponse.json({ status: "not_configured" });
  }

  if (isProwessLiveBlocked()) {
    return stored
      ? NextResponse.json({ status: "ok", data: stored.data, fetchedAt: stored.fetchedAt, source: "store-stale" })
      : NextResponse.json({
          status: "unavailable",
          message:
            "Live CMIE Prowess data is unavailable (API key or subscription). Use fundamentals above, or ask your admin to update PROWESS_API_KEY.",
        });
  }

  const prowessCompany = resolveProwessCompany(company);

  try {
    const data = await getReport(prowessCompany, cfg.batch, await loadBatch(cfg.batch));
    await putStored(company, report, data).catch(() => {});
    return NextResponse.json({ status: "ok", data, fetchedAt: new Date(), source: "live" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Prowess request failed";
    if (isProwessAuthError(e)) {
      blockProwessLive();
      await putError(company, report, msg).catch(() => {});
      return stored
        ? NextResponse.json({ status: "ok", data: stored.data, fetchedAt: stored.fetchedAt, source: "store-stale" })
        : NextResponse.json({
            status: "unavailable",
            message:
              "CMIE Prowess rejected the server API key or subscription. Reported financials cannot be loaded until PROWESS_API_KEY is valid.",
            detail: msg,
          });
    }
    await putError(company, report, msg).catch(() => {});
    if (stored) return NextResponse.json({ status: "ok", data: stored.data, fetchedAt: stored.fetchedAt, source: "store-stale" });
    return NextResponse.json({ status: "error", error: msg }, { status: 502 });
  }
}
