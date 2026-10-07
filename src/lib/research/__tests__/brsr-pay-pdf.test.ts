import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ destroy: vi.fn(), page: vi.fn() }));
vi.mock("unpdf", () => ({ getDocumentProxy: async () => ({ numPages: 2, getPage: mocks.page, loadingTask: { destroy: mocks.destroy } }) }));
import { extractBrsrPay } from "../brsr-pay.mjs";
beforeEach(() => {
  mocks.destroy.mockReset().mockResolvedValue(undefined);
  mocks.page.mockReset().mockImplementation(async (page: number) => ({ getTextContent: async () => ({ items: [{ str: page === 1 ? "Median remuneration/wages (in lakhs) Male Female Number Median Number Median" : "Board of Directors 2 20 1 10 Employees other than BoD and KMP 40 2.5 30 2 Workers 0 NA 0 NA" }] }), cleanup: vi.fn() }));
});
it("reads a pay header and its table across adjacent pages and releases the PDF", async () => {
  const out = await extractBrsrPay(new Uint8Array());
  expect(out.pages).toEqual([1, 2]);
  expect(out.rows[1].maleMedian).toBe(250000);
  expect(out.rows[1].femaleMedian).toBe(200000);
  expect(mocks.destroy).toHaveBeenCalled();
});
it("stops at the page cap without returning numbers from an incomplete table", async () => {
  const out = await extractBrsrPay(new Uint8Array(), { maxPages: 1 });
  expect(out.rows).toEqual([]);
  expect(out.reason).toBe("PDF page limit reached");
  expect(mocks.page).toHaveBeenCalledTimes(1);
});
