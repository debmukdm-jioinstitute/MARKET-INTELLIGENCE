import { getBytes, inRange } from "../http";
import type { Collector, SeriesResult } from "../types";
import { excelDate, readXlsx } from "../xlsx";

const ERP_URL = "https://pages.stern.nyu.edu/~adamodar/pc/implprem/ERPbymonth.xlsx";
const CTRY_URL = "https://pages.stern.nyu.edu/~adamodar/pc/datasets/ctryprem.xlsx";
const CTRY = ["India", "United States", "China", "Brazil", "Japan", "Germany", "United Kingdom"];

export const damodaran: Collector = {
  id: "damodaran",
  async run() {
    const erpBook = readXlsx(await getBytes(ERP_URL));
    const sh = erpBook.sheets.find((s) => s.rows.get(1)?.get("A") === "Date" && /ERP/.test(String(s.rows.get(1)?.get("D"))))
    if (!sh) throw new Error("Damodaran ERP sheet layout changed");
    const erpObs = [...sh.rows.entries()]
      .filter(([r]) => r > 1)
      .flatMap(([, c]) => {
        const d = c.get("A"), e = c.get("D");
        return typeof d === "number" && typeof e === "number" && e > 0 && e < 0.2
          ? [{ date: excelDate(d, erpBook.date1904), value: e * 100, meta: { riskFree: typeof c.get("C") === "number" ? (c.get("C") as number) * 100 : null } }]
          : [];
      });
    if (!erpObs.length) throw new Error("Damodaran ERP sheet layout changed");

    const cBook = readXlsx(await getBytes(CTRY_URL));
    const cs = cBook.sheets.find((s) => s.name === "ERPs by country");
    if (!cs) throw new Error("Damodaran 'ERPs by country' sheet missing");
    const updated = cs.rows.get(2)?.get("B");
    const asOf = typeof updated === "number" ? excelDate(updated, cBook.date1904) : new Date().toISOString().slice(0, 10);
    const base = { category: "valuation" as const, provider: "Damodaran (NYU Stern)", url: CTRY_URL };
    const out: SeriesResult[] = [
      { id: "damodaran_us_implied_erp", label: "US implied equity risk premium (monthly)", unit: "%", category: "valuation" as const, provider: base.provider, url: ERP_URL, obs: erpObs },
    ];
    for (const [, c] of cs.rows) {
      const name = c.get("A");
      if (typeof name !== "string" || !CTRY.includes(name)) continue;
      const total = c.get("H"), crp = c.get("I");
      if (typeof total !== "number" || typeof crp !== "number") continue;
      const slug = name.toLowerCase().replace(/\s+/g, "_");
      out.push(
        { ...base, id: `damodaran_${slug}_total_erp`, label: `${name} total equity risk premium`, unit: "%", obs: [{ date: asOf, value: inRange("total_erp", total * 100, 0, 40) }] },
        { ...base, id: `damodaran_${slug}_crp`, label: `${name} country risk premium`, unit: "%", obs: [{ date: asOf, value: inRange("crp", crp * 100, 0, 40) }] },
      );
    }
    return out;
  },
};
