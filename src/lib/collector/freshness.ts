export type Freshness = "fresh" | "stale" | "failing" | "pending";

/** Max acceptable age (days) of the latest observation, by series id prefix; longest matching prefix wins. */
const MAX_AGE_DAYS: [string, number][] = [
  ["rbi_", 5],
  ["in_", 5],
  ["india_fx_reserves", 100],
  ["cboe_", 6],
  ["eurusd", 6],
  ["ecb_mro", 120],
  ["ea_hicp", 75],
  ["cot_", 12],
  ["us_cpi", 75],
  ["us_unemployment", 75],
  ["us_payrolls", 75],
  ["amfi_", 6],
  ["damodaran_us_implied", 50],
  ["damodaran_", 400],
];

export function maxAgeDays(id: string): number {
  const hit = MAX_AGE_DAYS.filter(([p]) => id.startsWith(p)).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : 30;
}

export function classify(row: { id: string; last_ok: string | Date | null; last_error: string | null; latest_date: string | Date | null }, now = Date.now()): Freshness {
  const lastOk = row.last_ok ? new Date(row.last_ok).getTime() : null;
  // Failing = most recent run errored and nothing has succeeded in the last 6h.
  if (row.last_error && (lastOk == null || now - lastOk > 6 * 3_600_000)) return "failing";
  if (!row.latest_date) return "pending";
  const ageDays = (now - new Date(row.latest_date).getTime()) / 86_400_000;
  return ageDays > maxAgeDays(row.id) ? "stale" : "fresh";
}
