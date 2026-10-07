import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export type CronStatus = "running" | "success" | "error";

/** Trigger label from the request: ?trigger=github|vercel|manual, default "schedule". */
export function triggerOf(req: Request): string {
  try {
    const t = new URL(req.url).searchParams.get("trigger");
    if (t && /^[a-z0-9_-]{1,24}$/i.test(t)) return t.toLowerCase();
  } catch {
    /* ignore */
  }
  return "schedule";
}

/** Insert a run row; returns the run id (or null when logging is unavailable). Never throws. */
export async function startRun(jobName: string, trigger: string = "schedule"): Promise<string | null> {
  try {
    if (!hasDatabase()) return null;
    await ensureSchema();
    const rows = (await sql()`
      INSERT INTO cron_run_log (job_name, trigger) VALUES (${jobName}, ${trigger})
      RETURNING id
    `) as { id: string }[];
    return rows[0]?.id ?? null;
  } catch (e) {
    console.warn("[cron-log] startRun failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Mark a run finished. Never throws. */
export async function finishRun(
  id: string | null,
  outcome: { status: Exclude<CronStatus, "running">; rowsWritten?: number; error?: string },
): Promise<void> {
  if (!id) return;
  try {
    await sql()`
      UPDATE cron_run_log
      SET finished_at = now(), status = ${outcome.status},
          rows_written = ${outcome.rowsWritten ?? 0},
          error = ${outcome.error ? outcome.error.slice(0, 2000) : null}
      WHERE id = ${id}
    `;
  } catch (e) {
    console.warn("[cron-log] finishRun failed:", e instanceof Error ? e.message : e);
  }
}

type RowsOf = (body: unknown) => number;

/**
 * Wrap a cron route handler with run journaling. Status is derived from the
 * HTTP code; rows via an optional extractor over the JSON body. Logging can
 * never break the route: failures are swallowed and the response is returned.
 */
export async function withCronRun(
  jobName: string,
  req: Request,
  fn: () => Promise<NextResponse>,
  rowsOf?: RowsOf,
): Promise<NextResponse> {
  const runId = await startRun(jobName, triggerOf(req));
  try {
    const res = await fn();
    let rows = 0;
    let error: string | undefined;
    if (rowsOf) {
      try {
        const body = (await res.clone().json()) as unknown;
        rows = Math.max(0, Math.floor(rowsOf(body) || 0));
        const b = body as { ok?: boolean; error?: unknown };
        if (b && b.ok === false && b.error != null) error = String(b.error).slice(0, 500);
      } catch {
        /* non-JSON body — keep defaults */
      }
    }
    const status = res.status < 400 ? "success" : "error";
    await finishRun(runId, { status, rowsWritten: rows, error });
    return res;
  } catch (e) {
    await finishRun(runId, { status: "error", error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

/** Reject a promise if it takes longer than ms. The underlying work keeps running; only the wait is cut. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer!));
}
