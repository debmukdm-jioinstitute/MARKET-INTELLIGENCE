import { feedFetch } from "@/lib/feeds/http";
import type { Collector, Obs, SeriesResult } from "../types";

/**
 * NPCI UPI monthly statistics. The statistics page is a React app; its table comes from NPCI's own
 * JSON API (confirmed live): /api/product-statistic/tab/detail?product_name=upi&tab_name=upi-monthly-statistics
 * &year_range=<FY>&excel_type=monthly  → results[] { month: "September-2026", total_volume (Mn), total_value (Cr) }.
 * One request per financial year (current + previous two = ~24+ months).
 */

const BASE = "https://www.npci.org.in/api/product-statistic/tab/detail";
export const UPI_PAGE = "https://www.npci.org.in/what-we-do/upi/product-statistics";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

type UpiRow = { month?: string; total_volume?: string | number; total_value?: string | number };

/** Indian financial-year label ("2026-27") for a date. */
export function financialYear(d: Date): string {
  const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}
const prevFy = (fy: string) => {
  const y = Number(fy.slice(0, 4)) - 1;
  return `${y}-${String(y + 1 - 2000).padStart(2, "0")}`;
};

export function parseUpiRows(json: unknown): { vol: Obs[]; val: Obs[] } {
  const d = (json as { status?: number; data?: { results?: UpiRow[] } } | null)?.data;
  const vol: Obs[] = [];
  const val: Obs[] = [];
  for (const r of d?.results ?? []) {
    const m = /^([A-Za-z]+)-(\d{4})$/.exec(r.month ?? "");
    const mi = m ? MONTHS.indexOf(m[1]!.toLowerCase()) : -1;
    if (!m || mi < 0) continue;
    const date = `${m[2]}-${String(mi + 1).padStart(2, "0")}-01`;
    const v = Number(r.total_volume);
    const c = Number(r.total_value);
    if (Number.isFinite(v) && v > 0) vol.push({ date, value: v });
    if (Number.isFinite(c) && c > 0) val.push({ date, value: c });
  }
  return { vol, val };
}

export const upiStats: Collector = {
  id: "upi-stats",
  actionsOnly: true,
  async run() {
    let fy = financialYear(new Date());
    const vol = new Map<string, Obs>();
    const val = new Map<string, Obs>();
    const errors: string[] = [];
    for (let i = 0; i < 3; i++) {
      const url = `${BASE}?product_name=upi&tab_name=upi-monthly-statistics&year_range=${fy}&excel_type=monthly`;
      try {
        const res = await feedFetch(url, { timeoutMs: 25_000, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const p = parseUpiRows(await res.json());
        for (const o of p.vol) vol.set(o.date, o);
        for (const o of p.val) val.set(o.date, o);
      } catch (e) {
        errors.push(`${fy}: ${e instanceof Error ? e.message : String(e)}`);
      }
      fy = prevFy(fy);
      await new Promise((r) => setTimeout(r, 400));
    }
    const sort = (m: Map<string, Obs>) => [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
    const out: SeriesResult[] = [];
    if (vol.size) out.push({ id: "upi_volume_mn", label: "UPI transaction volume (monthly)", unit: "million", category: "macro", provider: "NPCI", url: UPI_PAGE, obs: sort(vol) });
    if (val.size) out.push({ id: "upi_value_cr", label: "UPI transaction value (monthly)", unit: "₹ crore", category: "macro", provider: "NPCI", url: UPI_PAGE, obs: sort(val) });
    if (!out.length) throw new Error(`upi-stats: no rows from NPCI (${errors.join(" | ") || "empty response"})`);
    return out;
  },
};
