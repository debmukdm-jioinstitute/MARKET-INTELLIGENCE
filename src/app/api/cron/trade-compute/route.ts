import { cronUnauthorized } from "@/lib/api-guard";
import { hasDatabase } from "@/lib/db";
import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { broadcastTelegram } from "@/lib/notify/telegram";
import { publishEvents } from "@/lib/notify/publish";
import { detectLabEvents, type LabEvent } from "@/lib/trade-lab/alerts";
import { readLab, writeLab } from "@/lib/trade-lab/cache";
import { INDEX_INSTRUMENTS } from "@/lib/trade-lab/data";
import { computeLab } from "@/lib/trade-lab/engine";
import { TIMEFRAMES, type Timeframe } from "@/lib/trade-lab/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 50_000;
const CONCURRENCY = 6;
const MAX_ALERTS = 15;

/**
 * Pre-compute cron. Warms the cache for every index + F&O stock so page loads are instant, and emits
 * transition alerts (RSI 70/30 cross, MACD flip, volume-confirmed breakout) to the notification feed + owner Telegram.
 * ?tf=1d (default) · ?offset=0&limit=80 to slice the universe across invocations · ?alerts=0 to skip alerts.
 * Circuit breaker: after 3 consecutive source failures the run stops rather than hammering a throttled feed.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const tf = (sp.get("tf") ?? "1d") as Timeframe;
  if (!TIMEFRAMES.some((t) => t.id === tf)) return NextResponse.json({ error: "bad tf" }, { status: 400 });
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const limit = Math.min(300, Math.max(1, Number(sp.get("limit") ?? 300) || 300));
  const alerts = sp.get("alerts") !== "0";

  const fo = await listFoUniverse().catch(() => []);
  const universe = [...INDEX_INSTRUMENTS.map((i) => i.id), ...fo.map((s) => s.symbol)].slice(offset, offset + limit);

  const started = Date.now();
  const events: LabEvent[] = [];
  let done = 0, failed = 0, consecutiveFails = 0, tripped = false, cursor = 0;

  const worker = async () => {
    while (cursor < universe.length && !tripped && Date.now() - started < BUDGET_MS) {
      const sym = universe[cursor++];
      try {
        const prev = alerts ? await readLab(sym, tf) : null;
        const cur = await computeLab(sym, tf);
        if ("error" in cur) throw new Error(cur.error);
        if (prev) events.push(...detectLabEvents(prev.data, cur));
        await writeLab(sym, tf, cur);
        done++;
        consecutiveFails = 0;
      } catch {
        failed++;
        if (++consecutiveFails >= 3) tripped = true;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  let published = 0;
  let telegram = 0;
  if (alerts && events.length) {
    published = await publishEvents(
      events.slice(0, 40).map((e) => ({ key: e.key, category: "scanner", severity: e.severity, title: e.title, body: e.body, href: `/intelligence/trade-lab?symbol=${encodeURIComponent(e.symbol)}&tf=${e.tf}` })),
    ).catch(() => 0);
    const top = events.filter((e) => e.severity === "medium").slice(0, MAX_ALERTS);
    if (top.length) {
      const sent = await broadcastTelegram(`Trade Lab · ${tf} · ${top.length} signal${top.length > 1 ? "s" : ""}\n` + top.map((e) => `• ${e.title} — ${e.body}`).join("\n")).catch(() => ({ sent: 0 }));
      telegram = sent.sent;
    }
  }
  return NextResponse.json({ ok: !tripped, tf, universe: universe.length, computed: done, failed, tripped, remaining: Math.max(0, universe.length - cursor), events: events.length, published, telegram, db: hasDatabase(), ms: Date.now() - started });
}
