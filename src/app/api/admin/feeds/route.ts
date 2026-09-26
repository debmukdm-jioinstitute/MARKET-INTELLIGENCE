import { requireAdmin } from "@/lib/admin/guard";
import { classify } from "@/lib/collector/freshness";
import { collectorStatus } from "@/lib/collector/store";
import { ensureData360Schema } from "@/lib/data360/store";
import { ensureDataGovSchema } from "@/lib/datagov/store";
import { hasDatabase, sql } from "@/lib/db";
import { coverage } from "@/lib/prowess/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Row = { id: string; last_ok: string | null; last_error: string | null; latest_date: string | null; [k: string]: unknown };

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/** Health of every data feed: collector series, data.gov.in sync, Prowess coverage, scanner runs, research scrapes, upstream keys. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const rows = await safe((collectorStatus() as unknown as Promise<Row[]>), []);
  const series = rows.filter((r) => !r.id.startsWith("collector:")).map((r) => ({ ...r, status: classify(r) }));
  const counts = { fresh: 0, stale: 0, failing: 0, pending: 0 };
  for (const s of series) counts[s.status]++;
  const failures = rows.filter((r) => r.id.startsWith("collector:")).map((r) => ({ collector: r.id.slice(10), error: r.last_error, at: r.last_run }));

  await safe(ensureDataGovSchema(), undefined);
  await safe(ensureData360Schema(), undefined);
  const db = sql();
  const [datagov, data360, scanner, research, prowessErrors, prowess] = await Promise.all([
    safe(db`SELECT dataset_id, kind, ok, rows, error, ran_at FROM datagov_sync_log ORDER BY ran_at DESC LIMIT 15`, []),
    safe(db`SELECT database_id, indicator_id, kind, ok, rows, error, ran_at FROM data360_sync_log ORDER BY ran_at DESC LIMIT 15`, []),
    safe(db`SELECT id, run_at FROM scan_latest ORDER BY run_at DESC`, []),
    safe(db`SELECT source, ok, items_found, error, ran_at FROM research_scrape_log ORDER BY ran_at DESC LIMIT 15`, []),
    safe(db`SELECT symbol, report, error, failed_at FROM prowess_errors ORDER BY failed_at DESC LIMIT 15`, []),
    safe(coverage(), { stored: 0, failed: 0 }),
  ]);

  const keys = ["UPSTOX_ACCESS_TOKEN", "FRED_API_KEY", "DATA_GOV_IN_API_KEY", "PROWESS_API_KEY", "ALPHA_VANTAGE_API_KEY", "BLS_API_KEY", "MASSIVE_API_KEY", "POLYGON_API_KEY", "TRUEDATA_USERNAME"].map((k) => ({ key: k, set: Boolean(process.env[k]) }));

  return NextResponse.json({ counts, series, failures, datagov, data360, scanner, research, prowess, prowessErrors, keys });
}
