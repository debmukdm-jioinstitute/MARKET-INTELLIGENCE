#!/usr/bin/env tsx
/**
 * Generic ts-ingest runner (CLAUDE_BUILD_SPEC §5).
 *   npx tsx scripts/ts-ingest/run.ts [--only=a,b] [--since=YYYY-MM-DD] [--dry]
 * Env: SITE_URL, CRON_SECRET, FRED_API_KEY. Never writes the DB directly: results go to
 * /api/collector/ingest, bookkeeping to /api/ts/ingest-meta. Never synthesises missing dates.
 * Exit 1 only if every selected source failed.
 */
import type { SeriesResult } from "@/lib/collector/types";
import { SOURCES, type SourceCfg } from "./sources";
import { PARSERS } from "./parsers";
import { candidateDates, todayIst } from "./dates";
import { politeFetch } from "./http";

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) || undefined;
const DRY = process.argv.includes("--dry");
const site = (process.env.SITE_URL ?? "https://getmarketintelligence.in").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
const auth = { authorization: `Bearer ${secret ?? ""}`, "content-type": "application/json" };

type FileRow = { url: string; sha256: string | null; etag: string | null; last_modified: string | null };
const log = (o: Record<string, unknown>) => console.log(JSON.stringify(o));

async function meta(src: SourceCfg): Promise<{ latestObs: string | null; files: FileRow[] }> {
  if (DRY || !secret) return { latestObs: null, files: [] };
  try {
    const r = await fetch(`${site}/api/ts/ingest-meta?source=${src.id}&anchor=${src.anchorSeries}`, { headers: auth });
    if (r.ok) return (await r.json()) as { latestObs: string | null; files: FileRow[] };
  } catch { /* fall through: full window, upserts are idempotent */ }
  return { latestObs: null, files: [] };
}

async function post(path: string, body: unknown) {
  const r = await fetch(`${site}${path}`, { method: "POST", headers: auth, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000) });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 200)}`);
}

async function runSource(src: SourceCfg): Promise<{ ok: boolean; series: number }> {
  const t0 = Date.now();
  const files: Record<string, unknown>[] = [];
  const out = new Map<string, SeriesResult>();
  let error: string | null = null;
  try {
    if (src.needsEnv && !process.env[src.needsEnv]) throw new Error(`${src.needsEnv} not set`);
    const st = await meta(src);
    const known = new Map(st.files.map((f) => [f.url, f]));
    const dates = src.perDate ? candidateDates(st.latestObs, todayIst(), arg("since")) : [undefined];
    for (const d of dates) {
      for (const url of src.urls(d)) {
        const prev = known.get(url);
        const res = await politeFetch(url, { nse: src.nseCookie, prev });
        const safeUrl = url.replace(/api_key=[^&]+/, "api_key=***");
        if (res.status === 304 || (prev?.sha256 && prev.sha256 === res.sha256)) { log({ src: src.id, url: safeUrl, skip: "unchanged" }); continue; }
        if (res.status === 404 && src.perDate) { log({ src: src.id, date: d, skip: "not published (holiday/late)" }); continue; }
        if (res.status !== 200) throw new Error(`${safeUrl} → HTTP ${res.status}`);
        for (const s of PARSERS[src.parser](res.buf, { date: d, url })) {
          const prevS = out.get(s.id);
          if (prevS) prevS.obs.push(...s.obs); else out.set(s.id, { ...s, obs: [...s.obs] });
        }
        files.push({ url: safeUrl, source_id: src.id, etag: res.etag, last_modified: res.lastModified, sha256: res.sha256, bytes: res.bytes, status: res.status });
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const series = [...out.values()].filter((s) => s.obs.length);
  log({ src: src.id, series: series.length, obs: series.reduce((n, s) => n + s.obs.length, 0), error, ms: Date.now() - t0, dry: DRY });
  if (!DRY && secret) {
    try {
      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        for (let o = 0; o < s.obs.length; o += 5000) await post("/api/collector/ingest", { series: [{ ...s, obs: s.obs.slice(o, o + 5000) }] });
      }
      await post("/api/ts/ingest-meta", { files, status: [{ dataset: src.dataset, anchor: src.anchorSeries, lagDays: src.lagDays, error, runMs: Date.now() - t0 }] });
    } catch (e) {
      error = error ?? (e instanceof Error ? e.message : String(e));
      log({ src: src.id, level: "error", post: error });
    }
  }
  return { ok: !error, series: series.length };
}

async function main() {
  if (!DRY && !secret) { console.error("CRON_SECRET not set (use --dry to parse without posting)"); process.exit(2); }
  const only = (arg("only") ?? process.env.ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const list = only.length ? SOURCES.filter((s) => only.includes(s.id) || only.includes(s.dataset)) : SOURCES;
  const unknown = only.filter((o) => !SOURCES.some((s) => s.id === o || s.dataset === o));
  if (unknown.length) log({ level: "warn", msg: "no parser yet for", sources: unknown });
  if (!list.length) { console.error("nothing selected"); process.exit(unknown.length ? 0 : 2); }
  const results = [];
  for (const s of list) results.push(await runSource(s)); // sequential: polite per-host limits, partial failure never aborts others
  const okN = results.filter((r) => r.ok).length;
  log({ msg: "done", ok: okN, failed: results.length - okN });
  if (okN === 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
