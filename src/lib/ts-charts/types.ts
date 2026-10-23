import type { Fmt } from "./format";
import type { Tf } from "./transform";

export type ChartKind = "line" | "indicator" | "bars" | "share" | "area" | "histogram";
export type ChartSeries = { col: string; label: string; slot?: number; tone?: "hist" };
export type ChartPayload = {
  id: string;
  kind: ChartKind;
  title: string;
  source: string;
  methodUrl?: string;
  updated: string;
  fmt: Fmt;
  digits: number;
  series: ChartSeries[];
  rows: { date: string; [k: string]: number | null | string }[];
  band?: [number, number];
  records?: { hi: { date: string; v: number }; lo: { date: string; v: number } };
  transform?: Tf;
};
