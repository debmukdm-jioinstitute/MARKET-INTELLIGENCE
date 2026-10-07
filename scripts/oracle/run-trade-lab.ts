#!/usr/bin/env tsx
/**
 * Oracle Always Free: trade-lab compute cron runner.
 *
 * Performs IDENTICAL work to GET /api/cron/trade-compute (minus the HTTP
 * layer): warms the trade_lab_cache for every index + F&O symbol in the
 * requested slice (6 workers, 50s budget, circuit breaker after 3 consecutive
 * source failures), then emits transition alerts (RSI 70/30 cross, MACD flip,
 * volume-confirmed breakout) to the notification feed via the SAME
 * @/lib/notify/publish pipeline the route uses, and the same owner Telegram
 * digest. No logic is reimplemented here — every function is imported from
 * @/lib, exactly as the route does.
 *
 * NOTE: no HTTP exists on the VM, so the route's CRON_SECRET guard
 * (cronUnauthorized) is intentionally SKIPPED — this runs as trusted
 * execution context (a systemd timer on our own box), not an exposed
 * endpoint.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-trade-lab.ts --tf=1d --offset=0 --limit=300 [--alerts=1]
 *
 * The 4 production slices (replacing .github/workflows/trade-lab.yml):
 *   --tf=15m --limit=45
 *   --tf=1d --offset=0   --limit=100
 *   --tf=1d --offset=100 --limit=100
 *   --tf=1d --offset=200 --limit=100
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED  (any one; without it
 *       the script warns and exits 0 — jobs must NEVER crash-loop when env is
 *       absent)
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID | TELEGRAM_CHAT_IDS (optional — the
 *       owner Telegram digest is skipped gracefully when unset, compute still
 *       runs)
 *   UPSTOX_ACCESS_TOKEN (optional — Upstox candle source; falls back to Yahoo)
 *   FEED_USER_AGENT (optional — overrides the feed HTTP user agent)
 *   VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (optional — device push for
 *       "high"-severity events; trade-lab detectors emit medium/info only)
 *   NEXT_PUBLIC_SITE_URL (optional — deep links in Telegram event messages)
 */
import { hasDatabase } from "@/lib/db";
import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { broadcastTelegram } from "@/lib/notify/telegram";
import { publishEvents } from "@/lib/notify/publish";
import { detectLabEvents, type LabEvent } from "@/lib/trade-lab/alerts";
import { readLab, writeLab } from "@/lib/trade-lab/cache";
import { INDEX_INSTRUMENTS } from "@/lib/trade-lab/data";
import { computeLab } from "@/lib/trade-lab/engine";
import { TIMEFRAMES, type Timeframe } from "@/lib/trade-lab/types";

// Same constants as the route — keep in lockstep with
// src/app/api/cron/trade-compute/route.ts.
const BUDGET_MS = 50_000;
const CONCURRENCY = 6;
const MAX_ALERTS = 15;

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

function usage(): void {
  console.log(
    [
      "run-trade-lab.ts — trade-lab cache warmer + transition alerts (Oracle VM runner)",
      "",
      "Usage: npx --yes tsx@4.20.5 scripts/oracle/run-trade-lab.ts --tf=15m|1d --offset=N --limit=N [--alerts=0|1]",
      "",
      "Defaults: --tf=1d --offset=0 --limit=300 --alerts=1 (same as the route's query-param defaults)",
      "",
      "Production slices:",
      "  --tf=15m --limit=45",
      "  --tf=1d --offset=0   --limit=100",
      "  --tf=1d --offset=100 --limit=100",
      "  --tf=1d --offset=200 --limit=100",
      "",
      "Prints one JSON summary to stdout with the same fields the route returned:",
      "  { ok, tf, universe, computed, failed, tripped, remaining, events, published, telegram, db, ms }",
    ].join("\n"),
  );
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

// Validate tf before anything else — same position as the route's 400, so a
// misconfigured timer goes loud (exit 1) even when env is absent.
const tf = (arg("tf") ?? "1d") as Timeframe;
if (!TIMEFRAMES.some((t) => t.id === tf)) {
  console.error(
    JSON.stringify({ level: "error", script: "run-trade-lab", msg: `bad tf: ${arg("tf") ?? ""}`, valid: TIMEFRAMES.map((t) => t.id) }),
  );
  process.exit(1);
}
const offset = Math.max(0, Number(arg("offset") ?? "0") || 0);
const limit = Math.min(300, Math.max(1, Number(arg("limit") ?? "300") || 300));
const alerts = (arg("alerts") ?? "1") !== "0";

if (!hasDatabase()) {
  console.error(
    JSON.stringify({
      level: "warn",
      script: "run-trade-lab",
      msg: "DATABASE_URL / POSTGRES_URL / DATABASE_URL_UNPOOLED is not set — nothing to do",
    }),
  );
  process.exit(0);
}

async function main(): Promise<void> {
  const fo = await listFoUniverse().catch(() => []);
  const universe = [...INDEX_INSTRUMENTS.map((i) => i.id), ...fo.map((s) => s.symbol)].slice(offset, offset + limit);

  const started = Date.now();
  const events: LabEvent[] = [];
  let done = 0,
    failed = 0,
    consecutiveFails = 0,
    tripped = false,
    cursor = 0;

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
      events
        .slice(0, 40)
        .map((e) => ({
          key: e.key,
          category: "scanner",
          severity: e.severity,
          title: e.title,
          body: e.body,
          href: `/intelligence/trade-lab?symbol=${encodeURIComponent(e.symbol)}&tf=${e.tf}`,
        })),
    ).catch(() => 0);
    const top = events.filter((e) => e.severity === "medium").slice(0, MAX_ALERTS);
    if (top.length) {
      const sent = await broadcastTelegram(
        `Trade Lab · ${tf} · ${top.length} signal${top.length > 1 ? "s" : ""}\n` +
          top.map((e) => `• ${e.title} — ${e.body}`).join("\n"),
      ).catch(() => ({ sent: 0 }));
      telegram = sent.sent;
    }
  }

  console.log(
    JSON.stringify({
      ok: !tripped,
      tf,
      universe: universe.length,
      computed: done,
      failed,
      tripped,
      remaining: Math.max(0, universe.length - cursor),
      events: events.length,
      published,
      telegram,
      db: hasDatabase(),
      ms: Date.now() - started,
    }),
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ level: "error", script: "run-trade-lab", msg: "runner crashed", error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
