export type Obs = { date: string; value: number; meta?: Record<string, unknown> };

/**
 * Event rows (not numeric series) a collector wants stored in a dedicated table.
 * Travels on a SeriesResult so it rides the existing runner → ingest contract.
 */
export type RecordBatch = {
  table: "broker_calls" | "company_announcements";
  rows: Record<string, unknown>[];
  /** Max source cursor seen in `rows` (article id / ISO timestamp); persisted so the next run only fetches the delta. */
  watermark?: string;
};

export type SeriesResult = {
  id: string;
  label: string;
  unit: string;
  category: "market" | "macro" | "rates" | "valuation" | "positioning" | "funds";
  provider: string;
  url: string;
  obs: Obs[];
  records?: RecordBatch;
};

export type CollectorContext = {
  /** Last stored watermark for a collector id, or null (first run / no DB reachable → full window, dedup still protects). */
  watermark: (collectorId: string) => Promise<string | null>;
};

export type Collector = {
  id: string;
  run: (ctx?: CollectorContext) => Promise<SeriesResult[]>;
  /** Needs the GitHub Actions runner (browser-grade fetches, HF inference); skipped by the default Vercel cron sweep. */
  actionsOnly?: boolean;
};
