import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner/engine";
import { SCANNERS } from "@/lib/scanner/scanners";
import { saveScan } from "@/lib/scanner/store";
import type { ScanRun } from "@/lib/scanner/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily cron (after NSE close): scan the Nifty 500 with every scanner and store the latest result. ?symbols=INFY,TCS for a subset. */
/** Optional Telegram digest — only sent when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are configured. */
async function sendTelegramDigest(run: ScanRun): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const line = (id: string, icon: string) => {
    const def = SCANNERS.find((s) => s.id === id)!;
    const rows = run.scanners[id] ?? [];
    return rows.length ? `${icon} ${def.label} (${rows.length}): ${rows.slice(0, 6).map((r) => r.symbol).join(", ")}` : null;
  };
  const text = [
    `Nifty 500 scan — session ${run.lastBar}`,
    ...["high52w", "vcp", "volume-gainers", "golden-cross", "double-bottom"].map((id) => line(id, "🟢")),
    ...["low52w", "death-cross", "double-top"].map((id) => line(id, "🔴")),
  ].filter(Boolean).join("\n");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const symbols = new URL(req.url).searchParams.get("symbols")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  try {
    const run = await runScan({ symbols });
    // A partial run (timeout / Yahoo throttling) must not overwrite a good full scan.
    if (!symbols && run.scanned < run.universe * 0.6) {
      return NextResponse.json({ ok: false, error: "Too few symbols scanned; keeping previous result", scanned: run.scanned, universe: run.universe }, { status: 502 });
    }
    await saveScan(run);
    const telegram = symbols ? false : await sendTelegramDigest(run);
    return NextResponse.json({
      ok: true,
      telegram,
      lastBar: run.lastBar,
      scanned: run.scanned,
      failed: run.failed,
      matches: Object.fromEntries(Object.entries(run.scanners).map(([k, v]) => [k, v.length])),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
