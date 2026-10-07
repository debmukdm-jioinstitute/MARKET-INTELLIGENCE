import { describe, expect, it } from "vitest";
import { parseBrsrPay, validatePayRows, payRatios } from "../brsr-pay.mjs";
const table = "Median remuneration/wages Male Female Number Median Number Median Board of Directors (BoD) 3 12.5 1 11.2 KMP 1 21.7 0 NA Employees other than BoD and KMP 200 4.5 50 3.2 Workers 30 1.8 0 Nil";
describe("offline pay layouts", () => {
  it.each([["rupees", 1], ["lakhs", 1e5], ["lacs", 1e5], ["crores", 1e7], ["millions", 1e6]])("normalises %s and multiline labels", (unit, mult) => {
    const rows = parseBrsrPay(`Amounts in ${unit}. ${table.replace("Board of Directors", "Board of\nDirectors")}`);
    expect(rows[0].maleMedian).toBe(12.5 * mult);
    expect(rows[2].femaleMedian).toBe(3.2 * mult);
    expect(validatePayRows(rows)).toBe(true);
  });
  it("reads a header and following page together, Indian comma grouping and missing cells", () => {
    const rows = parseBrsrPay("Median remuneration/salary/wages (in rupees). " + "Board of Directors 5 1,23,45,678 Nil N.A. Key Managerial Personnel 2 54,32,100 1 21,32,000 Employees other than BoD and KMP 41,722 8,58,094 2,998 8,99,589 Workers 0 - 0 Not Applicable");
    expect(rows[0].maleMedian).toBe(12345678); expect(rows[0].femaleMedian).toBeNull(); expect(rows[3].maleMedian).toBeNull();
  });
  it("prefers revised numbers over the reported table and handles an Other-gender column", () => {
    const rows = parseBrsrPay("Reported Data Revised Data Median remuneration/wages Male Female Other Number Median Number Median Number Median Board of Directors 5 354742 0 0 0 0 KMP 22 562889 1 596767 0 0 Employees other than BoD and KMP 174819 126013 69848 112914 0 0 Workers 0 0 0 0 0 0 Male Female Other Number Median Number Median Number Median Board of Directors 5 4256904 0 0 0 0 KMP 22 6754668 1 7161204 0 0 Employees other than BoD and KMP 174819 1512156 69848 1 354968 0 0 Workers 0 0 0 0 0 0");
    expect(rows[0].maleMedian).toBe(4256904); expect(rows[2].maleMedian).toBe(1512156); expect(rows[2].femaleMedian).toBe(1354968);
  });
  it("reads a Board row qualified as Whole Time Directors", () => {
    const rows = parseBrsrPay(table.replace("Board of Directors (BoD)", "Board of Directors (BoD) - Whole Time Directors"));
    expect(rows[0].category).toBe("Board of Directors"); expect(rows[0].maleCount).toBe(3);
  });
  it("handles currency signs, inline Cr units and cell footnotes", () => {
    const rows = parseBrsrPay("Median remuneration/wages Male Female Number Median Number Median Board of Directors 5 $ 0.48 Cr* 2 0.54 Cr Key Managerial Personnel 4 9 Cr 0 # Not applicable # Employees other than BoD and KMPs 937 ` 0.1 Cr 34 ₹ 0.07 Cr Workers 0 - 0 -");
    expect(rows[0].maleMedian).toBe(4800000); expect(rows[2].femaleMedian).toBe(700000); expect(validatePayRows(rows)).toBe(true);
  });
  it("recognises numeric label footnotes only with an explicit numbered note", () => {
    const rows = parseBrsrPay("Median remuneration/wages (lakhs) Male Female Number Median Number Median Board of Directors (BoD) 1 7 16.25 2 10 Key Managerial Personnel 2 3 157.5 0 0 Employees other than BoD and KMP 1054 8.25 444 7.05 Notes: 1 Only sitting fees. 2 The KMP remuneration includes MD.");
    expect(rows[0].maleCount).toBe(7); expect(rows[0].maleMedian).toBe(1625000); expect(rows[1].maleCount).toBe(3);
  });
  it("reads company suffixes without combining board subgroups", () => {
    const rows = parseBrsrPay("Median remuneration/wages Male Female Number Median Number Median Board of Directors (BoD) of the Company Non-executive Directors 4 0 Nil NA Key Managerial Personnel $ of the Company 3 77607104 Nil Not Applicable Employees other than BoD and KMP of the Organisation ## 1265 2406000 512 1557482 Workers Not Applicable");
    expect(rows.map(r => r.category)).toEqual(["Key Managerial Personnel", "Employees (non-board, non-KMP)"]);
    expect(validatePayRows(rows)).toBe(true);
  });
  it("uses explicit employee Total rows and ignores footnote markers", () => {
    const rows = parseBrsrPay("Median remuneration/wages (crore) Male Female Number Median Number Median Board of Directors (BoD) 6 (1) 2.61 2 2.85 Key Managerial Personnel (KMP) (1)(3) 3 4.43 – – Employees (2) other than BoD and KMP Junior 51,073 0.04 47,630 0.04 Middle 1,08,289 0.11 71,368 0.10 Senior 39,604 0.31 10,627 0.25 Total 1,98,966 0.11 1,29,625 0.09 Workers NA NA NA NA");
    expect(rows[0].maleCount).toBe(6); expect(rows[2].maleCount).toBe(198966); expect(rows[2].femaleMedian).toBe(900000); expect(validatePayRows(rows)).toBe(true);
  });
  it("rejects fractional counts, mismatched zero counts, and invented executive layouts", () => {
    expect(parseBrsrPay(table.replace("3 12.5", "3.2 12.5"))[0]?.category).not.toBe("Board of Directors");
    expect(validatePayRows([{ category: "Employees (non-board, non-KMP)", maleCount: 0, maleMedian: 99, femaleCount: 0, femaleMedian: null }])).toBe(false);
    expect(parseBrsrPay("Median remuneration: named CEO 100 ratio to MRE 20")).toEqual([]);
  });
  it("does not assume executives must earn more than employees", () => {
    const rows = parseBrsrPay(table.replace("3 12.5", "3 1.5")); expect(validatePayRows(rows)).toBe(true); expect(payRatios(rows)[0].times).toBe(2.5);
  });
  it("keeps searching after a remuneration section without employee medians", () => {
    const incomplete = "Median remuneration/wages Board of Directors 2 20 1 10 KMP 1 50 0 NA ";
    const rows = parseBrsrPay(incomplete + "unrelated section ".repeat(1000) + table);
    expect(rows[0].maleMedian).toBe(12.5); expect(validatePayRows(rows)).toBe(true);
  });
  it("uses the table header's unit rather than unrelated preceding units", () => {
    const rows = parseBrsrPay("Unrelated figures in lakhs. " + table.replace("Median remuneration/wages", "Median remuneration/wages (in crore)"));
    expect(rows[0].maleMedian).toBe(125000000);
  });
  it("keeps a stated lakh scale when the header also contains a rupee symbol", () => {
    const rows = parseBrsrPay("Amounts in lakhs. " + table.replace("Median remuneration/wages", "Median remuneration/wages ₹"));
    expect(rows[0].maleMedian).toBe(1250000);
  });
  it("does not apply an inline row's unit to other rupee-denominated rows", () => {
    const rows = parseBrsrPay("Median remuneration/wages Male Female Number Median Number Median Board of Directors 3 12.5 lakhs 1 11.2 lakhs KMP 1 21.7 lakhs 0 NA Employees other than BoD and KMP 200 Rs 450000 50 320000 Workers 30 180000 0 Nil");
    expect(rows[0].maleMedian).toBe(1250000); expect(rows[2].maleMedian).toBe(450000);
  });
  it("declines ambiguous whole-rupee amounts under a scaled caption", () => {
    expect(parseBrsrPay("Median remuneration/wages (in lakhs) Board of Directors 3 15447364 0 NA Employees other than BoD and KMP 69 663288 15 648432")).toEqual([]);
  });
  it("preserves malformed comma tokens as unknown instead of guessing missing PDF digits", () => {
    const rows = parseBrsrPay("Median remuneration/wages Board of Directors 2 362,50,014 1 1,39,680,000 Employees other than BoD and KMP 23335 3,99,174 8278 3,47,94");
    expect(rows[0].maleMedian).toBe(36250014); expect(rows[0].femaleMedian).toBe(139680000);
    expect(rows[1].maleMedian).toBe(399174); expect(rows[1].femaleMedian).toBeNull();
    expect(validatePayRows(rows)).toBe(true);
  });
});
