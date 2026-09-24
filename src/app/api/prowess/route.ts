import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getBatch, getReport, hasProwessKey, ProwessError, sendBatch } from "@/lib/prowess/client";
import { loadBatch } from "@/lib/prowess/batches";

export const dynamic = "force-dynamic";

/** GET → config status. */
export async function GET() {
  return NextResponse.json({ configured: hasProwessKey() });
}

/**
 * POST (signed-in, non-guest only). The API key never leaves the server.
 *  {action:"report", company, batch}  → immediate report JSON
 *  {action:"send", batch}             → {token}
 *  {action:"status", token}           → {state, message?, files?}
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!hasProwessKey()) return NextResponse.json({ error: "PROWESS_API_KEY not configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  try {
    switch (body.action) {
      case "report": {
        const data = await getReport(String(body.company), String(body.batch), await loadBatch(String(body.batch)));
        return NextResponse.json({ data });
      }
      case "send": {
        const token = await sendBatch(String(body.batch), await loadBatch(String(body.batch)));
        return NextResponse.json({ token });
      }
      case "status":
        return NextResponse.json(await getBatch(String(body.token)));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    const status = e instanceof ProwessError ? 502 : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Prowess request failed" }, { status });
  }
}
