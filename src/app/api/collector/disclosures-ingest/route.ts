import { cronUnauthorized } from "@/lib/api-guard";
import { hasDatabase } from "@/lib/db";
import { clearFailure, markFailure } from "@/lib/collector/store";
import {
  ensureDisclosuresSchema,
  pruneDisclosures,
  saveDisclosures,
} from "@/lib/disclosures/store";
import type { NseAnnouncement } from "@/lib/disclosures/nse";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NSE_ANNOUNCEMENTS_URL = "https://www.nseindia.com/api/corporate-announcements?index=equities";

/**
 * Ingest API for the disclosures collector (free GitHub Actions runner as the
 * Apify replacement — same pattern as /api/collector/ingest, but for event
 * rows instead of numeric series).
 *
 * POST /api/collector/disclosures-ingest
 * Headers: Authorization: Bearer <CRON_SECRET>   (same secret as the other crons)
 * Body:    { disclosures?: NseAnnouncement[] }
 *
 * Honesty rules:
 * - Items missing seq_id/symbol/headline/announced_at are dropped.
 * - An empty usable payload is REJECTED (400) — never wipes last-good rows.
 * - Upserts are idempotent on the exchange's seq_id.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function cleanString(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function cleanItem(raw: unknown): NseAnnouncement | null {
  if (!isRecord(raw)) return null;
  const seqId = raw.seqId == null ? null : String(raw.seqId).trim();
  const symbol = cleanString(raw.symbol);
  const headline = cleanString(raw.headline);
  const announcedAt = cleanString(raw.announcedAt);
  if (!seqId || !symbol || !headline || !announcedAt) return null;
  if (Number.isNaN(Date.parse(announcedAt))) return null;
  return {
    seqId,
    symbol,
    companyName: cleanString(raw.companyName) ?? symbol,
    isin: cleanString(raw.isin),
    headline,
    category: cleanString(raw.category) ?? "General",
    announcedAt,
    pdfUrl: cleanString(raw.pdfUrl),
  };
}

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured on this deployment" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = isRecord(body) && Array.isArray(body.disclosures) ? body.disclosures : [];
  const items = raw.map(cleanItem).filter((x): x is NseAnnouncement => x !== null);
  if (!items.length) {
    await markFailure("collector:nse-disclosures", "NSE India", NSE_ANNOUNCEMENTS_URL, "ingest received no usable disclosure rows").catch(() => {});
    return NextResponse.json({ error: "Nothing usable to ingest", received: raw.length }, { status: 400 });
  }

  try {
    await ensureDisclosuresSchema();
    const saved = await saveDisclosures(items);
    const pruned = await pruneDisclosures().catch(() => 0);
    await clearFailure("nse-disclosures").catch(() => {});
    return NextResponse.json({ ok: true, received: raw.length, saved, pruned });
  } catch (e) {
    const error = e instanceof Error ? e.message : "save failed";
    await markFailure("collector:nse-disclosures", "NSE India", NSE_ANNOUNCEMENTS_URL, error).catch(() => {});
    return NextResponse.json({ error: "Save failed", detail: error }, { status: 500 });
  }
}
