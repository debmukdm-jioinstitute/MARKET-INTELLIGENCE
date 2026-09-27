export type MarketShiftItem = {
  id: string;
  num: string;
  metricKey: string;
  headline: string;
  tag: string;
  tagColor: string;
  dataSummary: string;
  sourceName: string;
  sourceUrl: string;
  methodology: string;
  relatedSecurities: { symbol: string; impact: string }[];
};

export type MarketShiftsPayload = {
  fetchedAt: string;
  slot: number;
  items: MarketShiftItem[];
};

/** Server + client poll interval (3 hours). */
export const WHAT_CHANGED_REFRESH_MS = 3 * 60 * 60 * 1000;
