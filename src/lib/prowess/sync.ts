import { getReport } from "./client";
import { loadBatch } from "./batches";
import { NIFTY_500 } from "./nifty500";
import { REPORTS, REPORT_IDS, type ReportId } from "./reports";
import { putError, putStored, stateMap } from "./store";

const RETRY_FAILED_MS = 3 * 24 * 3600 * 1000;

export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
  remaining: number;
  errors: { symbol: string; report: ReportId; error: string }[];
}

/**
 * Time-boxed, resumable sync. Picks the stalest (symbol, report) pairs across the Nifty 500 and fetches them
 * with limited concurrency, so repeated cron invocations walk the whole universe.
 */
export async function syncProwess(opts: { budgetMs?: number; concurrency?: number; symbols?: string[]; reports?: ReportId[] } = {}): Promise<SyncResult> {
  const budgetMs = opts.budgetMs ?? 240_000;
  const concurrency = opts.concurrency ?? 3;
  const symbols = opts.symbols ?? NIFTY_500.map((r) => r[0]);
  const reports = opts.reports ?? REPORT_IDS;
  const started = Date.now();
  const { fetched, failed } = await stateMap();

  const due: { symbol: string; report: ReportId; age: number }[] = [];
  for (const symbol of symbols) {
    for (const report of reports) {
      const k = `${symbol}|${report}`;
      const at = fetched.get(k) ?? 0;
      const age = Date.now() - at;
      const stale = age > REPORTS[report].ttlHours * 3600 * 1000;
      const recentlyFailed = Date.now() - (failed.get(k) ?? 0) < RETRY_FAILED_MS;
      if (stale && !recentlyFailed) due.push({ symbol, report, age: at === 0 ? Infinity : age });
    }
  }
  due.sort((a, b) => b.age - a.age);

  const batches = new Map<ReportId, Uint8Array>();
  for (const r of reports) batches.set(r, await loadBatch(REPORTS[r].batch));

  const result: SyncResult = { attempted: 0, succeeded: 0, failed: 0, remaining: due.length, errors: [] };
  let i = 0;
  async function worker() {
    while (i < due.length && Date.now() - started < budgetMs) {
      const job = due[i++];
      result.attempted++;
      try {
        const data = await getReport(job.symbol, REPORTS[job.report].batch, batches.get(job.report)!);
        await putStored(job.symbol, job.report, data);
        result.succeeded++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.failed++;
        if (result.errors.length < 20) result.errors.push({ symbol: job.symbol, report: job.report, error: msg });
        await putError(job.symbol, job.report, msg).catch(() => {});
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  result.remaining = Math.max(0, due.length - result.attempted);
  return result;
}
