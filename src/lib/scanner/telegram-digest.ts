import { SCANNERS } from "@/lib/scanner/scanners";
import type { ScanRun } from "@/lib/scanner/types";

/**
 * Optional Telegram digest for a completed Nifty 500 scan — only sent when
 * TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are configured.
 *
 * Shared by the Vercel cron route (src/app/api/cron/scan/route.ts) and the
 * GitHub Actions runner (scripts/crons/run-scan.ts); extracted here so both
 * stay identical.
 */
export async function sendTelegramDigest(run: ScanRun): Promise<boolean> {
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
  if (!res?.ok) {
    const detail = res ? await res.text().catch(() => "") : "network error";
    console.warn(`telegram digest not sent: ${res?.status ?? "no response"} ${detail}`.slice(0, 300));
  }
  return Boolean(res?.ok);
}
