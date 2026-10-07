import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn(), configured: vi.fn(() => true) }));
vi.mock("@/lib/db", () => ({ hasDatabase: mocks.configured, ensureSchema: vi.fn(), sql: () => mocks.db, toDateString: (s: string) => s }));
import { payBatchSchema, readCompanyPay, upsertCompanyPay } from "../company-pay";
const rows = [{ category: "Board of Directors", maleCount: 2, maleMedian: 200, femaleCount: 0, femaleMedian: null }, { category: "Employees (non-board, non-KMP)", maleCount: 10, maleMedian: 100, femaleCount: 5, femaleMedian: 80 }];
const record = { symbol: "ACME", fy: "FY26", sourceUrl: "https://nsearchives.nseindia.com/corporate/pay.pdf", rows, extractedBy: "rules", status: "ok", reason: null, filingDate: "2026-06-01" };
beforeEach(() => { mocks.db.mockReset(); mocks.configured.mockReturnValue(true); });
it("validates sources, integer counts, unavailable rows and duplicate symbol/FY keys", () => {
  expect(payBatchSchema.safeParse({ rows: [record] }).success).toBe(true);
  for (const input of [{ ...record, sourceUrl: "not a URL" }, { ...record, sourceUrl: "http://localhost/x" }, { ...record, status: "unreadable" }, { ...record, rows: [{ ...rows[0], maleCount: 2.5 }, rows[1]] }]) expect(payBatchSchema.safeParse({ rows: [input] }).success).toBe(false);
  expect(payBatchSchema.safeParse({ rows: [record, record] }).success).toBe(false);
});
it("labels prior-year fallback and retains the failed latest filing", async () => {
  mocks.db.mockResolvedValue([{ fy: "FY26", source_url: record.sourceUrl, rows: [], extracted_by: "rules", status: "dead_link", reason: "HTTP 404", updated_at: "2026-07-01" }, { fy: "FY25", source_url: record.sourceUrl, rows, extracted_by: "rules", status: "ok", reason: null, updated_at: "2026-07-01", filing_date: "2025-06-01" }]);
  const pay = await readCompanyPay("ACME"); expect(pay?.fy).toBe("FY25"); expect(pay?.latestAttempt?.fy).toBe("FY26"); expect(pay?.ratios[0].times).toBe(2);
});
it("performs one parameterised atomic upsert and protects newer and last-good filings", async () => {
  mocks.db.mockResolvedValue([]); await upsertCompanyPay(payBatchSchema.parse({ rows: [record] }).rows);
  const [query, payload] = mocks.db.mock.calls[0]; const text = query.join("");
  expect(text).toContain("jsonb_to_recordset"); expect(text).toContain("EXCLUDED.filing_date >= company_pay.filing_date"); expect(JSON.parse(payload)[0].symbol).toBe("ACME");
});
it("does not serve stored numeric rows that fail validation", async () => {
  mocks.db.mockResolvedValue([{ fy: "FY26", source_url: record.sourceUrl, rows: [{ ...rows[0], maleCount: 2.5 }, rows[1]], extracted_by: "rules", status: "ok", reason: null, updated_at: "2026-07-01", filing_date: "2026-06-01" }]);
  const pay = await readCompanyPay("ACME");
  expect(pay?.status).toBe("unreadable"); expect(pay?.rows).toEqual([]); expect(pay?.ratios).toEqual([]);
});
