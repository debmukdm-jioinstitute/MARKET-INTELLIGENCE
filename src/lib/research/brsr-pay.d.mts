export type PayRow = { category: "Board of Directors" | "Key Managerial Personnel" | "Employees (non-board, non-KMP)" | "Workers"; maleCount: number | null; maleMedian: number | null; femaleCount: number | null; femaleMedian: number | null };
export const PAY_PARSER_VERSION: number;
export function filingDateIso(value: string | null | undefined): string | null;
export const PAY_CATEGORIES: PayRow["category"][];
export function parseBrsrPay(text: string): PayRow[];
export function validatePayRows(rows: unknown): boolean;
export function payRatios(rows: PayRow[]): { label: string; times: number }[];
export function extractBrsrPay(bytes: Uint8Array, options?: { maxPages?: number; timeoutMs?: number }): Promise<{ rows: PayRow[]; pages: number[]; evidence: string; totalPages: number; reason?: string }>;
