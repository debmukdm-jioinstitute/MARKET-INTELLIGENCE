import { gridRequest } from "./grid-india-tls";
import type { Collector, Obs, SeriesResult } from "../types";

/**
 * Grid-India (formerly POSOCO) daily Power Supply Position report.
 *
 * Discovery (confirmed live 2026-10-03): grid-india.in is a React app on `webapi.grid-india.in/api/v1`.
 *   POST /file {_source:"GRDW", _type:"DAILY_PSP_REPORT", _fileDate:<FY "2026-27">, _month:"09"}
 *   → [{ Title_: "30.09.26_NLDC_PSP", MimeType, FilePath, Field2: upload date }]  (one .xls + one .pdf per day)
 * The .xls is a legacy BIFF workbook (sheet "MOP_E", parsed with SheetJS). Row "Maximum Demand Met During
 * the Day (MW)" and "Energy Met (MU)" in the TOTAL column are the all-India headline figures. The file is a
 * "report for previous day": the data day is the title date (= reporting date − 1), cross-checked below.
 *
 * The workbook has NO year-on-year line, so to make YoY honest the collector also reads the SAME calendar day
 * one year earlier from the archive; YoY is then computed at read time from two real stored observations.
 *
 * Env: POWER_BACKFILL_DAYS (default 1) — latest N days (plus each day's year-ago twin) for the one-time backfill.
 */

const API = "https://webapi.grid-india.in/api/v1";
const CDN = "https://webcdn.grid-india.in/";
export const REPORT_PAGE = "https://grid-india.in/en/reports/daily-psp-report";

type FileRow = { Title_?: string; MimeType?: string; FilePath?: string; PeriodMonth?: string };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

export function fyLabel(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** "30.09.26_NLDC_PSP" → "2026-09-30". */
export function titleDay(title: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{2})_/.exec(title.trim());
  return m ? `20${m[3]}-${m[2]}-${m[1]}` : null;
}

const listingCache = new Map<string, FileRow[]>();
async function listFiles(day: string): Promise<FileRow[]> {
  const fy = fyLabel(day);
  const month = day.slice(5, 7);
  const key = `${fy}|${month}`;
  const hit = listingCache.get(key);
  if (hit) return hit;
  const res = await gridRequest(`${API}/file`, {
    method: "POST",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ _source: "GRDW", _type: "DAILY_PSP_REPORT", _fileDate: fy, _month: month }),
    timeoutMs: 25_000,
  });
  if (res.status !== 200) throw new Error(`Grid-India file list ${key} → HTTP ${res.status}`);
  const j = JSON.parse(new TextDecoder().decode(res.body)) as { flagType?: number; retData?: FileRow[] };
  const rows = Array.isArray(j.retData) ? j.retData : [];
  listingCache.set(key, rows);
  return rows;
}

/** The .xls rows of one month, newest data day first. */
const xlsFiles = (rows: FileRow[]) =>
  rows
    .filter((r) => /ms-excel|spreadsheet/i.test(r.MimeType ?? "") && r.FilePath && titleDay(r.Title_ ?? ""))
    .map((r) => ({ day: titleDay(r.Title_!)!, path: r.FilePath! }))
    .sort((a, b) => b.day.localeCompare(a.day));

export type PspFigures = { day: string; demandMw: number; energyMu: number };

/** Parse a daily PSP workbook (already read into row arrays). Exported for tests. */
export function parsePspRows(rows: unknown[][], expectDay: string): PspFigures {
  let reportDay: string | null = null;
  let totalCol = -1;
  let demand: number | null = null;
  let energy: number | null = null;
  for (const r of rows) {
    const cells = r.map((c) => (typeof c === "string" ? c.trim() : c));
    const label = typeof cells[0] === "string" ? cells[0] : "";
    if (!reportDay) {
      const i = cells.findIndex((c) => typeof c === "string" && /date of reporting/i.test(c));
      if (i >= 0) {
        const v = cells.slice(i + 1).find((c) => typeof c === "string" && /\d{1,2}-[A-Za-z]{3}-\d{4}/.test(c)) as string | undefined;
        const m = v ? /(\d{1,2})-([A-Za-z]{3})-(\d{4})/.exec(v) : null;
        if (m && MON[m[2]!.toLowerCase()]) {
          const d = new Date(Date.UTC(Number(m[3]), MON[m[2]!.toLowerCase()]! - 1, Number(m[1])));
          d.setUTCDate(d.getUTCDate() - 1); // "Report for previous day"
          reportDay = iso(d);
        }
      }
    }
    if (totalCol < 0) {
      const i = cells.findIndex((c) => c === "TOTAL");
      if (i >= 0 && cells.includes("NR") && cells.includes("WR")) totalCol = i;
    }
    if (totalCol >= 0) {
      const v = cells[totalCol];
      if (demand === null && /^Maximum Demand Met During the Day/i.test(label) && typeof v === "number") demand = v;
      if (energy === null && /^Energy Met \(MU\)/i.test(label) && typeof v === "number") energy = v;
    }
  }
  if (!reportDay) throw new Error("PSP workbook: 'Date of Reporting' not found (layout changed)");
  if (reportDay !== expectDay) throw new Error(`PSP workbook is for ${reportDay}, expected ${expectDay}`);
  if (demand === null || energy === null) throw new Error("PSP workbook: demand/energy TOTAL rows not found (layout changed)");
  if (demand < 80_000 || demand > 400_000) throw new Error(`PSP demand ${demand} MW outside plausible range`);
  if (energy < 1_500 || energy > 9_000) throw new Error(`PSP energy ${energy} MU outside plausible range`);
  return { day: reportDay, demandMw: demand, energyMu: energy };
}

async function readDay(path: string, day: string): Promise<PspFigures> {
  const res = await gridRequest(`${CDN}${path}`, { timeoutMs: 40_000 });
  if (res.status !== 200) throw new Error(`Grid-India ${path} → HTTP ${res.status}`);
  const XLSX = await import("xlsx");
  const wb = XLSX.read(res.body, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]!];
  if (!ws) throw new Error("PSP workbook has no sheets");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
  return parsePspRows(rows, day);
}

const yearAgo = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return iso(d);
};

export const powerDemand: Collector = {
  id: "power-demand",
  actionsOnly: true,
  timeoutMs: 600_000,
  async run() {
    const n = Math.max(1, Number(process.env.POWER_BACKFILL_DAYS) || 1);
    // Current-side days: newest n across this month and (if needed) the previous one.
    const today = iso(new Date());
    let files = xlsFiles(await listFiles(today));
    if (files.length < n) {
      const prev = new Date(`${today.slice(0, 8)}01T00:00:00Z`);
      prev.setUTCDate(0);
      files = [...files, ...xlsFiles(await listFiles(iso(prev)))];
    }
    if (!files.length) throw new Error("power-demand: no daily PSP .xls in the Grid-India listing");
    const targets = files.slice(0, n);

    const demand: Obs[] = [];
    const energy: Obs[] = [];
    const failed: string[] = [];
    const take = async (day: string, path: string) => {
      try {
        const f = await readDay(path, day);
        const meta = { source: `${CDN}${path}` };
        demand.push({ date: f.day, value: f.demandMw, meta });
        energy.push({ date: f.day, value: f.energyMu, meta });
      } catch (e) {
        failed.push(`${day}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await sleep(350);
    };

    for (const t of targets) {
      await take(t.day, t.path);
      const ly = yearAgo(t.day);
      const twin = xlsFiles(await listFiles(ly).catch(() => [])).find((f) => f.day === ly);
      if (twin) await take(ly, twin.path);
    }
    if (!demand.length) throw new Error(`power-demand: nothing parsed (${failed.join(" | ")})`);
    if (failed.length) console.warn(JSON.stringify({ level: "warn", msg: "power-demand partial failure", failed: failed.slice(0, 5), count: failed.length }));

    const uniq = (o: Obs[]) => [...new Map(o.map((x) => [x.date, x])).values()].sort((a, b) => a.date.localeCompare(b.date));
    const out: SeriesResult[] = [
      { id: "power_demand_met_mw", label: "All-India maximum demand met during the day", unit: "MW", category: "macro", provider: "Grid-India (NLDC)", url: REPORT_PAGE, obs: uniq(demand) },
      { id: "power_energy_met_mu", label: "All-India energy met during the day", unit: "MU", category: "macro", provider: "Grid-India (NLDC)", url: REPORT_PAGE, obs: uniq(energy) },
    ];
    return out;
  },
};
