import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ hasDatabase: () => false, ensureSchema: vi.fn(), sql: vi.fn() }));
vi.mock("@/lib/feeds/india/nse-session", () => ({ nseJson: vi.fn() }));
import { parseBrsrPay, parseDividends } from "../company-leadership";

describe("BRSR median pay parser", () => {
  it("reads rupee tables with Nil/NA cells", () => {
    const rows = parseBrsrPay("a. Median remuneration/wages Male Female Number Median remuneration/ salary/ wages of respective category Number Median remuneration/ salary/ wages of respective category Board of Directors (BoD)* 5 20,00,00,000 Nil NA Key Managerial Personnel# 1 20,30,06,059 1 4,26,50,304 Employees other than BoD and KMP** 41,722 8,58,094 2,998 8,99,589 Workers 3,865 11,97,269 70 15,90,487");
    expect(rows.map((r) => r.category)).toEqual(["Board of Directors", "Key Managerial Personnel", "Employees (non-board, non-KMP)", "Workers"]);
    expect(rows[0]).toMatchObject({ maleCount: 5, maleMedian: 200000000, femaleCount: null, femaleMedian: null });
    expect(rows[2].maleMedian).toBe(858094);
  });
  it("converts lakhs and decimals to rupees", () => {
    const rows = parseBrsrPay("Median remuneration / wages: (` in lakhs) Particulars Male Female Number Median remuneration/ salary/ wages of respective category Number Median remuneration/ salary/ wages of respective category Board of Directors (BoD) 8 57.04 1 55.80 Key Managerial Personnel 4 911 0 NA Employees other than BoD and KMP 2410 12.81 173 10.44 Workers 883 109.68 51 121.44");
    expect(rows.find((r) => r.category === "Board of Directors")?.maleMedian).toBe(5704000);
    expect(rows.find((r) => r.category.startsWith("Employees"))?.maleMedian).toBe(1281000);
  });
  it("returns nothing when the table is absent", () => expect(parseBrsrPay("no pay table here")).toEqual([]));
});

describe("dividend parser", () => {
  it("keeps cash dividends only and sorts newest first", () => {
    const d = parseDividends([{ subject: "Dividend - Rs 5 Per Share", exDate: "05-Jun-2025" }, { subject: "Bonus 1:1", exDate: "01-Jan-2025" }, { subject: "Interim Dividend - Re 1 Per Share", exDate: "10-Feb-2026" }, { subject: "Dividend - Nil", exDate: "01-Jan-2024" }]);
    expect(d.map((x) => [x.exDate, x.perShare])).toEqual([["2026-02-10", 1], ["2025-06-05", 5]]);
  });
});
