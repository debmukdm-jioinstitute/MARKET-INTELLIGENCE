import { NextResponse } from "next/server";
import { cronUnauthorized } from "@/lib/api-guard";
import { hasDatabase } from "@/lib/db";
import { payBatchSchema, upsertCompanyPay } from "@/lib/research/company-pay";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  // Bound the body while streaming, even when Content-Length was omitted.
  if (Number(req.headers.get("content-length")) > 512000) return NextResponse.json({ error: "Batch too large" }, { status: 413 });
  let body;
  try {
    const reader = req.body?.getReader(); if (!reader) throw new Error("Empty body");
    const parts: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 512000) return NextResponse.json({ error: "Batch too large" }, { status: 413 }); parts.push(value); } }
    finally { await reader.cancel().catch(() => {}); }
    body = JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = payBatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid pay batch", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) }, { status: 400 });
  try {
    const saved = await upsertCompanyPay(parsed.data.rows);
    return NextResponse.json({ ok: true, received: parsed.data.rows.length, saved: saved.length, unchanged: parsed.data.rows.length - saved.length });
  } catch { return NextResponse.json({ error: "Pay batch could not be saved" }, { status: 503 }); }
}
