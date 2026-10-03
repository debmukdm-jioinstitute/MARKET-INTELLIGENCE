import { feedFetch } from "@/lib/feeds/http";
import type { Collector, Obs, SeriesResult } from "../types";

/**
 * Monsoon proxy: daily precipitation at six agricultural-belt points from Open-Meteo (keyless).
 *
 * IMPORTANT — what this is and is not: Open-Meteo serves weather-MODEL precipitation (ECMWF IFS / ERA5
 * reanalysis), not IMD rain-gauge readings. It is a good directional proxy for "is the monsoon running
 * ahead of or behind its usual pace", and the UI labels it that way. "Normal" is computed at read time
 * from the same source's own stored years (never a published IMD normal, never invented), and is shown
 * only when at least 3 earlier years are available for the same window.
 *
 * Coordinates (documented as required — one point per major rain-fed farming belt):
 *   bhopal     23.26, 77.41  Central India (soybean / pulses)
 *   nagpur     21.15, 79.09  Central-south / Vidarbha (cotton / soybean)
 *   jaipur     26.91, 75.79  North-west (bajra / pulses)
 *   ludhiana   30.90, 75.85  North-west plains (rice / wheat belt)
 *   lucknow    26.85, 80.95  Gangetic plain (rice / sugarcane)
 *   hyderabad  17.39, 78.49  South peninsula (rice / cotton / pulses)
 *
 * Regular run: forecast API `past_days=10` (recent actual days; one request per point).
 * One-time backfill: MONSOON_BACKFILL_YEARS=5 pulls archive-api history (one request per point).
 */

export const MONSOON_POINTS = [
  { id: "bhopal", label: "Central India (Bhopal)", lat: 23.26, lon: 77.41 },
  { id: "nagpur", label: "Vidarbha (Nagpur)", lat: 21.15, lon: 79.09 },
  { id: "jaipur", label: "North-west (Jaipur)", lat: 26.91, lon: 75.79 },
  { id: "ludhiana", label: "Punjab plains (Ludhiana)", lat: 30.9, lon: 75.85 },
  { id: "lucknow", label: "Gangetic plain (Lucknow)", lat: 26.85, lon: 80.95 },
  { id: "hyderabad", label: "South peninsula (Hyderabad)", lat: 17.39, lon: 78.49 },
] as const;

export const rainSeriesId = (loc: string) => `rain_mm_${loc}`;

type OmDaily = { daily?: { time?: string[]; precipitation_sum?: (number | null)[] } };

export function parseOpenMeteo(json: OmDaily, today: string): Obs[] {
  const t = json.daily?.time ?? [];
  const v = json.daily?.precipitation_sum ?? [];
  const out: Obs[] = [];
  for (let i = 0; i < t.length; i++) {
    const x = v[i];
    // Skip today and the future (forecast values are not observations) and nulls (not yet published).
    if (!t[i] || t[i]! >= today || typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 1_000) continue;
    out.push({ date: t[i]!, value: x });
  }
  return out;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const monsoon: Collector = {
  id: "monsoon",
  actionsOnly: true,
  timeoutMs: 300_000,
  async run() {
    const years = Math.max(0, Number(process.env.MONSOON_BACKFILL_YEARS) || 0);
    const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10); // IST date
    const out: SeriesResult[] = [];
    const failed: string[] = [];
    for (const p of MONSOON_POINTS) {
      const base = `latitude=${p.lat}&longitude=${p.lon}&daily=precipitation_sum&timezone=Asia%2FKolkata`;
      const urls: string[] = [`https://api.open-meteo.com/v1/forecast?${base}&past_days=10&forecast_days=1`];
      if (years > 0) {
        const start = new Date(`${today}T00:00:00Z`);
        start.setUTCFullYear(start.getUTCFullYear() - years);
        const end = new Date(`${today}T00:00:00Z`);
        end.setUTCDate(end.getUTCDate() - 6); // archive lags a few days; the forecast call covers the tail
        urls.unshift(`https://archive-api.open-meteo.com/v1/archive?${base}&start_date=${start.toISOString().slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}`);
      }
      const merged = new Map<string, Obs>();
      for (const url of urls) {
        try {
          const res = await feedFetch(url, { timeoutMs: 60_000 });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          for (const o of parseOpenMeteo((await res.json()) as OmDaily, today)) merged.set(o.date, o);
        } catch (e) {
          failed.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
        await sleep(500);
      }
      if (merged.size) {
        out.push({
          id: rainSeriesId(p.id),
          label: `Daily rainfall — ${p.label}`,
          unit: "mm",
          category: "macro",
          provider: "Open-Meteo (model data)",
          url: `https://open-meteo.com/en/docs#latitude=${p.lat}&longitude=${p.lon}&daily=precipitation_sum`,
          obs: [...merged.values()].sort((a, b) => a.date.localeCompare(b.date)),
        });
      }
    }
    if (!out.length) throw new Error(`monsoon: nothing collected (${failed.join(" | ")})`);
    if (failed.length) console.warn(JSON.stringify({ level: "warn", msg: "monsoon partial failure", failed }));
    return out;
  },
};
