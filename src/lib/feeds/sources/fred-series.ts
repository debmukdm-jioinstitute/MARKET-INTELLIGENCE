import { feedFetch } from "@/lib/feeds/http";
import type { MacroPoint } from "@/lib/feeds/types";

/** Latest-first FRED observations (skips "." missing values). */
export async function fetchFredSeriesPoints(seriesId: string, limit = 60): Promise<MacroPoint[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) return [];
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
    seriesId,
  )}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await feedFetch(url, { timeoutMs: 15_000 });
  if (!res.ok) return [];
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  const rows = (json.observations ?? [])
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
  return rows.reverse();
}
