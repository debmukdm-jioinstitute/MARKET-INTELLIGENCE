/**
 * Prowess sync runner. CMIE only accepts the API key from its registered IP, so run this from that machine.
 * Fetches Nifty 500 reports from CMIE and either
 *   - pushes them to the deployed site (PROWESS_INGEST_URL + PROWESS_INGEST_SECRET), or
 *   - writes to local Postgres / .prowess-cache (no PROWESS_INGEST_URL).
 *
 *   set -a; . .env.local; set +a; npx tsx scripts/prowess-sync.ts [--once] [SYMBOL,SYMBOL]
 */
import { getReport, hasProwessKey } from "../src/lib/prowess/client.ts";
import { loadBatch } from "../src/lib/prowess/batches.ts";
import { NIFTY_500 } from "../src/lib/prowess/nifty500.ts";
import { REPORTS, REPORT_IDS, type ReportId } from "../src/lib/prowess/reports.ts";
import { putStored, stateMap } from "../src/lib/prowess/store.ts";

const INGEST = process.env.PROWESS_INGEST_URL?.replace(/\/$/, "");
const SECRET = process.env.PROWESS_INGEST_SECRET;
const CONCURRENCY = 4;

async function remote(method: "GET" | "POST", body?: unknown) {
  const res = await fetch(`${INGEST}/api/prowess/ingest`, {
    method,
    headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`ingest ${method} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function freshness(): Promise<Map<string, number>> {
  if (!INGEST) return (await stateMap()).fetched;
  return new Map(Object.entries((await remote("GET")).fetched as Record<string, number>));
}

async function main() {
  if (!hasProwessKey()) throw new Error("PROWESS_API_KEY not set");
  if (INGEST && !SECRET) throw new Error("PROWESS_INGEST_SECRET not set");
  const only = process.argv.slice(2).find((a) => !a.startsWith("--"))?.split(",");
  const symbols = only ?? NIFTY_500.map((r) => r[0]);

  const fetched = await freshness();
  const due: { symbol: string; report: ReportId; at: number }[] = [];
  for (const symbol of symbols)
    for (const report of REPORT_IDS) {
      const at = fetched.get(`${symbol}|${report}`) ?? 0;
      if (Date.now() - at > REPORTS[report].ttlHours * 3600_000) due.push({ symbol, report, at });
    }
  due.sort((a, b) => a.at - b.at);
  console.log(`${due.length} reports due (${INGEST ? "→ " + INGEST : "→ local store"})`);

  const batches = new Map<ReportId, Uint8Array>();
  for (const r of REPORT_IDS) batches.set(r, await loadBatch(REPORTS[r].batch));

  let i = 0, ok = 0, failed = 0;
  const pending: { symbol: string; report: ReportId; data: unknown }[] = [];
  const flush = async () => {
    if (!pending.length) return;
    const items = pending.splice(0, pending.length);
    if (INGEST) await remote("POST", { items });
    else for (const it of items) await putStored(it.symbol, it.report, it.data);
  };
  async function worker() {
    while (i < due.length) {
      const job = due[i++];
      try {
        const data = await getReport(job.symbol, REPORTS[job.report].batch, batches.get(job.report)!);
        pending.push({ symbol: job.symbol, report: job.report, data });
        ok++;
        if (pending.length >= 10) await flush();
      } catch (e) {
        failed++;
        console.log(`  ! ${job.symbol}/${job.report}: ${e instanceof Error ? e.message : e}`);
      }
      if ((ok + failed) % 50 === 0) console.log(`  ${ok + failed}/${due.length} ok=${ok} failed=${failed}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await flush();
  console.log(`done ok=${ok} failed=${failed}`);
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
