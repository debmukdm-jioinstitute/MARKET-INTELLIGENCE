export type Obs = { date: string; value: number; meta?: Record<string, unknown> };

/**
 * Event rows (not numeric series) a collector wants stored in a dedicated table.
 * Travels on a SeriesResult so it rides the existing runner → ingest contract.
 * Table names and row shapes are defined once in record-tables.ts.
 */
export type RecordBatch = {
  table: string;
  rows: Record<string, unknown>[];
  /** Cursor for the collector itself (max article id / ISO timestamp) — stored under the collector id. */
  watermark?: string;
  /** Extra named cursors (e.g. per-symbol "shareholding:RELIANCE" → last broadcast date). */
  watermarks?: Record<string, string>;
};

export type SeriesResult = {
  id: string;
  label: string;
  unit: string;
  category: "market" | "macro" | "rates" | "valuation" | "positioning" | "funds";
  provider: string;
  url: string;
  obs: Obs[];
  /** One or more event-row batches (a collector may feed several tables). */
  records?: RecordBatch | RecordBatch[];
};

export type CollectorContext = {
  /** Last stored watermark for a key, or null (first run / no DB reachable → full window, dedup still protects). */
  watermark: (key: string) => Promise<string | null>;
  /** All stored watermarks whose key starts with `prefix` (key → value). Empty when unreachable. */
  watermarks: (prefix: string) => Promise<Record<string, string>>;
};

export type Collector = {
  id: string;
  run: (ctx?: CollectorContext) => Promise<SeriesResult[]>;
  /** Needs the GitHub Actions runner (browser-grade fetches, HF inference); skipped by the default Vercel cron sweep. */
  actionsOnly?: boolean;
};

export const batchesOf = (r: SeriesResult): RecordBatch[] => (r.records ? (Array.isArray(r.records) ? r.records : [r.records]) : []);
