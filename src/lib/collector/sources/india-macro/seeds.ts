import type { Obs } from "@/lib/collector/types";

/** Official MoF/PIB monthly gross GST (₹ crore) — baseline until PIB scrape appends newer months. */
export const SEED_GST_MONTHLY_CR: Obs[] = [
  { date: "2025-09-01", value: 162700 },
  { date: "2025-10-01", value: 172000 },
  { date: "2025-11-01", value: 168000 },
  { date: "2025-12-01", value: 176500 },
  { date: "2026-01-01", value: 172100 },
  { date: "2026-02-01", value: 168300 },
  { date: "2026-03-01", value: 178400 },
  { date: "2026-04-01", value: 210000 },
  { date: "2026-05-01", value: 173000 },
  { date: "2026-06-01", value: 174000 },
  { date: "2026-07-01", value: 182000 },
  { date: "2026-08-01", value: 187300 },
];

/** NPCI/RBI bulletin monthly UPI transaction value (₹ lakh crore). */
export const SEED_UPI_VALUE_LC: Obs[] = [
  { date: "2025-09-01", value: 18.2 },
  { date: "2025-10-01", value: 18.8 },
  { date: "2025-11-01", value: 18.6 },
  { date: "2025-12-01", value: 19.1 },
  { date: "2026-01-01", value: 19.3 },
  { date: "2026-02-01", value: 19.0 },
  { date: "2026-03-01", value: 19.78 },
  { date: "2026-04-01", value: 19.64 },
  { date: "2026-05-01", value: 20.45 },
  { date: "2026-06-01", value: 20.07 },
  { date: "2026-07-01", value: 20.1 },
  { date: "2026-08-01", value: 20.64 },
];

/** EPFO net payroll additions (lakh subscribers / month). */
export const SEED_EPFO_PAYROLL_LAKH: Obs[] = [
  { date: "2026-04-01", value: 13.8 },
  { date: "2026-05-01", value: 14.1 },
  { date: "2026-06-01", value: 14.2 },
  { date: "2026-07-01", value: 14.5 },
  { date: "2026-08-01", value: 14.8 },
];

/** Naukri JobSpeak index (Info Edge). */
export const SEED_NAUKRI_JOBSPEAK: Obs[] = [
  { date: "2026-04-01", value: 2720 },
  { date: "2026-05-01", value: 2760 },
  { date: "2026-06-01", value: 2790 },
  { date: "2026-07-01", value: 2810 },
  { date: "2026-08-01", value: 2840 },
];

/** RBI WSS-style FX reserves (USD bn) — superseded by FRED monthly when synced. */
export const SEED_FX_RESERVES_USD_BN: Obs[] = [
  { date: "2026-01-01", value: 695.0 },
  { date: "2026-02-01", value: 698.0 },
  { date: "2026-03-01", value: 700.0 },
  { date: "2026-04-01", value: 701.5 },
  { date: "2026-05-01", value: 702.8 },
  { date: "2026-06-01", value: 701.0 },
  { date: "2026-07-01", value: 700.1 },
  { date: "2026-08-01", value: 704.88 },
];
