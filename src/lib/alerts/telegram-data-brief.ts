/**
 * Telegram market-data brief — ALL collected data, twice daily.
 *
 * Sends the owner's Telegram chats a compact briefing of every series the
 * collectors maintain (RBI rates, FII/DII flows, fund NAVs, India macro,
 * ECB/Fed-adjacent global macro, VIX, COT positioning, valuation). Runs from
 * the `telegram-data-brief` cron shortly after each GitHub Actions collector
 * run (06:30 and 18:30 IST).
 *
 * Honesty contract: every line comes from a real row in collected_obs.
 * Series with no observations are skipped silently; stale or failing sources
 * are labelled as such (via the shared freshness classifier). Nothing is
 * interpolated, estimated, or invented. Unconfigured Telegram → silent no-op.
 */

import { hasDatabase, sql } from "@/lib/db";
import { ensureCollectorSchema, latestPoints } from "@/lib/collector/store";
import { classify } from "@/lib/collector/freshness";
import { getState, setState } from "@/lib/notify/store";
import { broadcastTelegram, hasTelegramConfigured } from "@/lib/notify/telegram";

const MAX_MSG = 4000;
const MAX_MESSAGES = 4;

type SeriesMeta = {
  id: string;
  label: string;
  unit: string;
  provider: string;
  last_ok: string | null;
  last_error: string | null;
};

type BriefLine = { id: string; text: string };
type BriefSection = { title: string; lines: BriefLine[] };

/** Section order: India first, then global. First matching section wins. */
const SECTIONS: { title: string; test: (id: string) => boolean }[] = [
  { title: "RBI \u00B7 RATES & LIQUIDITY", test: (id) => id.startsWith("rbi_") || id === "in_call_rate_mid" },
  { title: "FII / DII FLOWS", test: (id) => id.startsWith("nse_fii") || id.startsWith("nse_dii") },
  { title: "MUTUAL FUNDS \u00B7 NAV", test: (id) => id.startsWith("amfi_") },
  { title: "INDIA \u00B7 ECONOMY", test: (id) => id.startsWith("in_") || id.startsWith("india_fx") },
  { title: "EUROPE", test: (id) => id.startsWith("ecb_") || id === "eurusd" || id.startsWith("ea_hicp") },
  { title: "US \u00B7 MACRO", test: (id) => id.startsWith("us_") },
  { title: "VOLATILITY", test: (id) => id.startsWith("cboe_") },
  { title: "POSITIONING \u00B7 COT", test: (id) => id.startsWith("cot_") },
  { title: "VALUATION", test: (id) => id.startsWith("damodaran_") },
];

function sectionFor(id: string): string {
  return SECTIONS.find((s) => s.test(id))?.title ?? "OTHER";
}

/** Compact number: 1,234.5 / 18.20 / 0.0525 — trims noise, keeps precision. */
export function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return "\u2014";
  const a = Math.abs(v);
  const decimals = a >= 1000 ? 1 : a >= 100 ? 1 : a >= 1 ? 2 : 4;
  const s = v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  return s;
}

/** "2026-09-30" -> "30 Sep". */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${m[3].replace(/^0/, "")} ${months[Number(m[2]) - 1] ?? m[2]}`;
}

/**
 * One briefing line for a series. Pure and tested.
 * `point` is the latest observation (with previous value for the delta).
 */
export function formatLine(
  meta: SeriesMeta,
  point: { date: string; value: number; prev: number | null },
  now = Date.now(),
): string {
  const u = meta.unit?.trim() ?? "";
  const unit = !u ? "" : u === "%" ? "%" : ` ${u}`;
  let line = `${meta.label}: ${fmtNum(point.value)}${unit} (${fmtDate(point.date)}`;
  if (point.prev != null && Number.isFinite(point.prev) && point.prev !== point.value) {
    const d = point.value - point.prev;
    line += `, ${d > 0 ? "+" : ""}${fmtNum(d)} vs prev`;
  }
  const freshness = classify({ id: meta.id, last_ok: meta.last_ok, last_error: meta.last_error, latest_date: point.date }, now);
  if (freshness === "stale") line += " \u00B7 stale";
  else if (freshness === "failing") line += " \u00B7 source failing";
  return line + ")";
}

/** Pack sections into <= MAX_MSG plain-text messages, keeping headers with lines. */
export function chunkSections(sections: BriefSection[], header: string): string[] {
  const out: string[] = [];
  let cur = header;
  const push = () => {
    if (cur.trim() && cur.trim() !== header.trim()) out.push(cur.trimEnd());
    cur = "";
  };
  for (const s of sections) {
    const block = `\n${s.title}\n${s.lines.map((l) => `\u2022 ${l.text}`).join("\n")}\n`;
    if ((cur + block).length > MAX_MSG) {
      push();
      // A single oversized section gets split line-wise rather than dropped.
      let part = "";
      for (const l of s.lines) {
        const entry = `\u2022 ${l.text}\n`;
        if ((part + `\n${s.title} (cont.)\n` + entry).length > MAX_MSG && part) {
          out.push(`\n${s.title} (cont.)\n${part}`.trimEnd());
          part = "";
        }
        part += entry;
      }
      cur = `\n${s.title} (cont.)\n${part}`;
      continue;
    }
    cur += block;
  }
  push();
  return out.slice(0, MAX_MESSAGES);
}

async function readSeriesMeta(): Promise<SeriesMeta[]> {
  await ensureCollectorSchema();
  const rows = (await sql()`
    SELECT id, label, unit, provider, last_ok, last_error
    FROM collected_series
    WHERE id NOT LIKE 'collector:%'
    ORDER BY provider, id
  `) as { id: string; label: string; unit: string; provider: string; last_ok: unknown; last_error: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    unit: r.unit,
    provider: r.provider,
    last_error: r.last_error,
    last_ok:
      r.last_ok instanceof Date
        ? r.last_ok.toISOString()
        : typeof r.last_ok === "string"
          ? r.last_ok
          : null,
  }));
}

/** Build the briefing messages. Returns [] when there is nothing real to send. */
export async function buildDataBrief(now = Date.now()): Promise<{ messages: string[]; series: number; stale: number }> {
  const empty = { messages: [] as string[], series: 0, stale: 0 };
  if (!hasDatabase()) return empty;
  let metas: SeriesMeta[];
  try {
    metas = await readSeriesMeta();
  } catch {
    return empty;
  }
  if (!metas.length) return empty;
  const points = await latestPoints(metas.map((m) => m.id)).catch(() => []);
  const byId = new Map(points.map((p) => [p.id, p]));

  const sections = new Map<string, BriefSection>();
  let stale = 0;
  for (const meta of metas) {
    const p = byId.get(meta.id);
    if (!p) continue; // no observations: skip, never invent
    const title = sectionFor(meta.id);
    if (!sections.has(title)) sections.set(title, { title, lines: [] });
    const line = formatLine(meta, p, now);
    if (line.includes("\u00B7 stale") || line.includes("\u00B7 source failing")) stale++;
    sections.get(title)!.lines.push({ id: meta.id, text: line });
  }
  // Keep SECTIONS order, then any fallback sections alphabetically.
  const ordered = [...sections.values()].sort((a, b) => {
    const ia = SECTIONS.findIndex((s) => s.title === a.title);
    const ib = SECTIONS.findIndex((s) => s.title === b.title);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.title.localeCompare(b.title);
  });
  const series = ordered.reduce((n, s) => n + s.lines.length, 0);
  if (!series) return empty;

  const day = new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const header =
    `\uD83D\uDCCA Market data brief \u2014 ${day} (IST)\n` +
    `All collector series, latest values. Not investment advice.\n`;
  const messages = chunkSections(ordered, header);
  return { messages, series, stale };
}

const istSlot = (now = Date.now()) => {
  const ist = new Date(now + 5.5 * 3_600_000);
  const day = ist.toISOString().slice(0, 10);
  return `${day}-${ist.getUTCHours() < 12 ? "am" : "pm"}`;
};

/**
 * Send the briefing (persistent per-slot dedup, survives deploys).
 * Never throws: Telegram is an enhancement, not a dependency.
 */
export async function sendDataBrief(now = Date.now()): Promise<{
  sent: boolean;
  messages: number;
  series: number;
  stale: number;
  skipped?: string;
}> {
  const none = { sent: false, messages: 0, series: 0, stale: 0 };
  if (!hasDatabase() || !hasTelegramConfigured()) return { ...none, skipped: "unconfigured" };
  try {
    const slot = istSlot(now);
    const prev = await getState<{ slot: string }>("telegram_data_brief");
    if (prev?.slot === slot) return { ...none, skipped: "already-sent" };

    const brief = await buildDataBrief(now);
    if (!brief.messages.length) return { ...none, skipped: "no-data" };

    let sent = 0;
    for (const msg of brief.messages) {
      const r = await broadcastTelegram(msg).catch(() => ({ sent: 0, failed: 0 }));
      if (r.sent > 0) sent++;
      else break; // stop on failure rather than half-delivering
    }
    if (sent === brief.messages.length) {
      await setState("telegram_data_brief", { slot });
      return { sent: true, messages: sent, series: brief.series, stale: brief.stale };
    }
    return { ...none, series: brief.series, stale: brief.stale, skipped: "partial-send" };
  } catch {
    return { ...none, skipped: "error" };
  }
}
