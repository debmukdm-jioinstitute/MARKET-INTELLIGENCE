import { requireAdmin } from "@/lib/admin/guard";
import { CRONS, ENV_VARS, FLAGS } from "@/lib/admin/system";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const env = ENV_VARS.map((v) => ({ ...v, set: Boolean(process.env[v.key] || (v.key === "DATABASE_URL" && (process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED)) || (v.key === "AUTH_SECRET" && process.env.SESSION_SECRET)) }));
  const db = hasDatabase();
  let flags = FLAGS.map((f) => ({ ...f, enabled: true }));
  let stats: Record<string, number | null> = {};
  let scrapeLog: unknown[] = [];
  if (db) {
    await ensureSchema();
    const d = sql();
    try {
      const rows = (await d`SELECT flag, enabled FROM feature_flags`) as unknown as { flag: string; enabled: boolean }[];
      flags = FLAGS.map((f) => ({ ...f, enabled: rows.find((r) => r.flag === f.flag)?.enabled ?? true }));
    } catch {}
    const tables = ["users", "brief_subscriptions", "alert_rules", "alert_events", "push_subscriptions", "newsletter_subscribers", "research_reports", "scan_latest", "prowess_reports", "prowess_errors"];
    const results = await Promise.all(
      tables.map(async (t) => {
        try {
          const r = (await d.query(`SELECT count(*)::int AS n FROM ${t}`)) as unknown as { n: number }[];
          return [t, r[0]?.n ?? 0] as const;
        } catch {
          return [t, null] as const;
        }
      }),
    );
    stats = Object.fromEntries(results);
    try {
      scrapeLog = (await d`SELECT source, ok, items_found, error, ran_at FROM research_scrape_log ORDER BY ran_at DESC LIMIT 10`) as unknown as unknown[];
    } catch {}
  }
  return NextResponse.json({ db, crons: CRONS, env, flags, stats, scrapeLog, cronSecretSet: Boolean(process.env.CRON_SECRET) });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => ({}))) as { action?: string; path?: string; flag?: string; enabled?: boolean };

  if (body.action === "flag") {
    const known = FLAGS.some((f) => f.flag === body.flag);
    if (!known || typeof body.enabled !== "boolean") return NextResponse.json({ error: "Unknown flag" }, { status: 400 });
    if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
    await ensureSchema();
    await sql()`INSERT INTO feature_flags (flag, enabled, updated_at) VALUES (${body.flag!}, ${body.enabled}, now()) ON CONFLICT (flag) DO UPDATE SET enabled = ${body.enabled}, updated_at = now()`;
    return NextResponse.json({ ok: true });
  }

  if (body.action === "run") {
    const job = CRONS.find((c) => c.path === body.path);
    if (!job) return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    const started = Date.now();
    try {
      const res = await fetch(new URL(job.path, req.url), {
        headers: process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
        cache: "no-store",
      });
      const text = await res.text();
      return NextResponse.json({ ok: res.ok, status: res.status, ms: Date.now() - started, body: text.slice(0, 1500) });
    } catch (e) {
      return NextResponse.json({ ok: false, status: 0, ms: Date.now() - started, body: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
