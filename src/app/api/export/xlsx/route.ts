import { NextResponse } from "next/server";
import { buildExport } from "@/lib/export/build";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 60 * 60_000;
const MAX_PER_WINDOW = 4;
const hits = new Map<string, number[]>();

/** Sliding-window limit so the export cannot be used to hammer the upstream data sources. */
function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  hits.set(key, [...recent, now]);
  return false;
}

/**
 * GET → the complete data workbook (.xlsx). Requires `?agree=1`, the visitor's acceptance of the personal-use terms
 * shown on the export page. Every workbook carries the disclaimer, contact details and a per-download export ID.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const url = new URL(req.url);
  if (url.searchParams.get("agree") !== "1") return NextResponse.json({ error: "You must accept the terms of use to download." }, { status: 400 });

  const who = user.guest ? "Guest" : user.email;
  if (limited(user.guest ? `ip:${req.headers.get("x-forwarded-for") ?? "unknown"}` : who)) {
    return NextResponse.json({ error: "Download limit reached (4 per hour). Please try again later." }, { status: 429 });
  }

  try {
    // never cached: each workbook is stamped with its recipient and export ID
    const logo = await fetch(new URL("/logo.png", url.origin), { cache: "force-cache" })
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b ? Buffer.from(b) : null))
      .catch(() => null);
    const r = await buildExport({ generatedFor: who, logo });
    return new Response(new Uint8Array(r.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${r.filename}"`,
        "Cache-Control": "no-store",
        "X-Export-Id": r.exportId,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Export failed" }, { status: 500 });
  }
}
