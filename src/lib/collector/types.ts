export type Obs = { date: string; value: number; meta?: Record<string, unknown> };

export type SeriesResult = {
  id: string;
  label: string;
  unit: string;
  category: "market" | "macro" | "rates" | "valuation" | "positioning" | "funds";
  provider: string;
  url: string;
  obs: Obs[];
};

export type Collector = {
  id: string;
  run: () => Promise<SeriesResult[]>;
};
