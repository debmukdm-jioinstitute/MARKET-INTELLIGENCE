import type { Data360Obs } from "./client";

export type Data360SeriesRow = {
  ref_area: string;
  time_period: string;
  obs_value: number | null;
  unit_measure: string | null;
  freq: string | null;
  payload?: unknown;
};

export function liveObsToRows(obs: Data360Obs[], refFilter?: string): Data360SeriesRow[] {
  return obs
    .filter((o) => !refFilter || o.REF_AREA === refFilter)
    .map((o) => ({
      ref_area: o.REF_AREA,
      time_period: o.TIME_PERIOD,
      obs_value: o.OBS_VALUE != null && o.OBS_VALUE !== "" ? Number(o.OBS_VALUE) : null,
      unit_measure: o.UNIT_MEASURE ?? null,
      freq: o.FREQ ?? null,
      payload: o,
    }))
    .sort((a, b) => a.time_period.localeCompare(b.time_period));
}
