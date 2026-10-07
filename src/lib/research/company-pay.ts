import { z } from "zod";
import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { PAY_CATEGORIES, payRatios, validatePayRows, type PayRow } from "./brsr-pay.mjs";

export const payRowSchema = z.object({
  category: z.enum(PAY_CATEGORIES as [PayRow["category"], ...PayRow["category"][]]),
  maleCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  maleMedian: z.number().positive().finite().nullable(),
  femaleCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  femaleMedian: z.number().positive().finite().nullable(),
}).strict();
const sourceUrl = z.url().refine((s) => {
  try {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && ["nsearchives.nseindia.com", "archives.nseindia.com", "www.nseindia.com"].includes(u.hostname);
  } catch { return false; }
}, "Expected an official NSE HTTPS filing URL").nullable();
export const companyPaySchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9&.\-]{1,20}$/), fy: z.string().regex(/^FY\d{2}$/),
  sourceUrl, rows: z.array(payRowSchema).max(4), extractedBy: z.enum(["rules", "model"]),
  status: z.enum(["ok", "unreadable", "dead_link", "not_filed"]), reason: z.string().max(500).nullable(),
  filingDate: z.iso.date().nullable(),
}).strict().superRefine((r, ctx) => {
  if (r.status === "ok" && (!r.sourceUrl || !validatePayRows(r.rows))) ctx.addIssue({ code: "custom", message: "OK requires a source and validated employee/pay rows" });
  if (r.status !== "ok" && r.rows.length) ctx.addIssue({ code: "custom", message: "Failed extractions cannot carry pay numbers" });
  if (r.status === "not_filed" && r.sourceUrl) ctx.addIssue({ code: "custom", message: "not_filed cannot claim a filing source" });
});
export const payBatchSchema = z.object({ rows: z.array(companyPaySchema).min(1).max(100) }).strict().superRefine((b, ctx) => {
  const keys = b.rows.map((r) => `${r.symbol}:${r.fy}`);
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: "custom", message: "Duplicate symbol/FY in batch" });
});
export type CompanyPayInput = z.infer<typeof companyPaySchema>;
export type CompanyPay = CompanyPayInput & { ratios: { label: string; times: number }[]; updatedAt: string; latestAttempt?: { fy: string; status: string; reason: string | null; sourceUrl: string | null } };

export async function readCompanyPay(symbol: string): Promise<CompanyPay | null> {
  if (!hasDatabase()) return null;
  // Migrations/ingestion create the table; public reads must not run schema DDL.
  const rows = await sql()`SELECT symbol, fy, source_url, rows, extracted_by, status, reason, filing_date, updated_at FROM company_pay WHERE symbol = ${symbol} ORDER BY substring(fy from 3)::int DESC, filing_date DESC NULLS LAST LIMIT 8`;
  const latest = rows[0];
  if (!latest) return null;
  const r = rows.find((row) => row.status === "ok" && validatePayRows(row.rows)) ?? latest;
  const valid = r.status === "ok" && validatePayRows(r.rows);
  const invalidStoredRows = r.status === "ok" && !valid;
  return { symbol, fy: r.fy, sourceUrl: r.source_url, rows: valid ? r.rows : [], extractedBy: r.extracted_by, status: invalidStoredRows ? "unreadable" : r.status, reason: invalidStoredRows ? "Stored pay rows failed validation" : r.reason, filingDate: r.filing_date ? toDateString(r.filing_date) : null, updatedAt: new Date(r.updated_at).toISOString(), ratios: valid ? payRatios(r.rows) : [], ...(r !== latest ? { latestAttempt: { fy: latest.fy, status: latest.status, reason: latest.reason, sourceUrl: latest.source_url } } : {}) };
}

/** Atomic parameterised batch. Ignore older files and preserve last-good rows on transient same-file failures. */
export async function upsertCompanyPay(rows: CompanyPayInput[]) {
  await ensureSchema();
  const payload = rows.map((r) => ({ symbol: r.symbol, fy: r.fy, source_url: r.sourceUrl, rows: r.rows, extracted_by: r.extractedBy, status: r.status, reason: r.reason, filing_date: r.filingDate }));
  return sql()`INSERT INTO company_pay (symbol, fy, source_url, rows, extracted_by, status, reason, filing_date, updated_at)
    SELECT symbol, fy, source_url, rows, extracted_by, status, reason, filing_date, now()
    FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS r(symbol text, fy text, source_url text, rows jsonb, extracted_by text, status text, reason text, filing_date date)
    ON CONFLICT (symbol, fy) DO UPDATE SET source_url = EXCLUDED.source_url, rows = EXCLUDED.rows, extracted_by = EXCLUDED.extracted_by, status = EXCLUDED.status, reason = EXCLUDED.reason, filing_date = EXCLUDED.filing_date, updated_at = now()
    WHERE (company_pay.filing_date IS NULL OR EXCLUDED.filing_date >= company_pay.filing_date)
      AND (EXCLUDED.status = 'ok' OR company_pay.status <> 'ok' OR company_pay.source_url IS DISTINCT FROM EXCLUDED.source_url OR company_pay.filing_date IS DISTINCT FROM EXCLUDED.filing_date)
    RETURNING symbol, fy`;
}
