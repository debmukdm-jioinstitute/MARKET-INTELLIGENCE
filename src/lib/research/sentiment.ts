/** Pure helpers for the Buzz & Sentiment views. Aggregates only — no individual posts or users. */

export type SourceId = "reddit" | "telegram" | "youtube" | "gdelt";
export const SOURCE_LABEL: Record<SourceId, string> = { reddit: "Reddit", telegram: "Telegram", youtube: "YouTube", gdelt: "News (GDELT)" };
export const ALL_SOURCES: SourceId[] = ["reddit", "telegram", "youtube", "gdelt"];

export type DailyRow = {
  day: string;
  source: SourceId;
  mentions: number;
  volumeZ: number | null;
  sentimentMean: number | null;
  sentimentVelocity: number | null;
  buzzing: boolean;
  bullishShare: number | null;
  topics: string[] | null;
};

export type SourceDigest = {
  source: SourceId;
  live: boolean; // data in the last 3 days
  lastDay: string | null;
  mentions: number; // last 7 days
  bullishPct: number | null; // mentions-weighted share of positive items; null when nothing was scored
  themes: string[]; // up to 3, most frequent topics across the week
};

const WEEK_MS = 7 * 86_400_000;

/** Per-source digest over the last 7 days of rows (`asOf` = "today", injectable for tests). */
export function buildDigest(rows: DailyRow[], asOf = new Date()): SourceDigest[] {
  const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const weekStart = dayOf(asOf.getTime() - WEEK_MS);
  const liveStart = dayOf(asOf.getTime() - 3 * 86_400_000);
  return ALL_SOURCES.map((source) => {
    const mine = rows.filter((r) => r.source === source);
    const week = mine.filter((r) => r.day > weekStart);
    const mentions = week.reduce((a, r) => a + r.mentions, 0);
    const scored = week.filter((r) => r.bullishShare !== null);
    const w = scored.reduce((a, r) => a + r.mentions, 0);
    const bullishPct = w > 0 ? Math.round((scored.reduce((a, r) => a + r.bullishShare! * r.mentions, 0) / w) * 100) : null;
    const freq = new Map<string, number>();
    for (const r of week) for (const t of r.topics ?? []) freq.set(t, (freq.get(t) ?? 0) + r.mentions);
    const themes = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
    const lastDay = mine.reduce<string | null>((a, r) => (!a || r.day > a ? r.day : a), null);
    return { source, live: lastDay !== null && lastDay >= liveStart, lastDay, mentions, bullishPct, themes };
  });
}

export type QuadrantPoint = { symbol: string; mentions: number; volumeZ: number; sentiment: number; buzzing: boolean; topics: string[] };

export type Quadrant = "talked-up" | "talked-down" | "quiet-happy" | "quiet-unhappy";
/** Plain-English quadrant: x = volume z-score (> 1 = unusually busy), y = sentiment (> 0 = happy). */
export function quadrantOf(p: Pick<QuadrantPoint, "volumeZ" | "sentiment">): Quadrant {
  const busy = p.volumeZ > 1;
  const happy = p.sentiment >= 0;
  return busy ? (happy ? "talked-up" : "talked-down") : happy ? "quiet-happy" : "quiet-unhappy";
}
export const QUADRANT_LABEL: Record<Quadrant, string> = {
  "talked-up": "Everyone's talking, mostly happy",
  "talked-down": "Everyone's talking, nobody's happy",
  "quiet-happy": "Quiet, mildly positive",
  "quiet-unhappy": "Quiet, mildly negative",
};

/** Normalise two series to 0–100 on a shared date axis for the attention-vs-price overlay. Prices use min-max over the window. */
export function overlaySeries(trend: { d: string; v: number }[], candles: { ts: string; close: number }[]): { date: string; trend: number | null; price: number | null }[] {
  if (!trend.length) return [];
  const start = trend[0].d;
  const px = candles.filter((c) => c.ts.slice(0, 10) >= start && Number.isFinite(c.close));
  if (!px.length) return trend.map((t) => ({ date: t.d, trend: t.v, price: null }));
  const lo = Math.min(...px.map((c) => c.close));
  const hi = Math.max(...px.map((c) => c.close));
  const span = hi - lo || 1;
  // For each weekly trend point, use the last close on or before that date.
  const sorted = [...px].sort((a, b) => (a.ts < b.ts ? -1 : 1));
  return trend.map((t) => {
    let close: number | null = null;
    for (const c of sorted) {
      if (c.ts.slice(0, 10) <= t.d) close = c.close;
      else break;
    }
    return { date: t.d, trend: t.v, price: close === null ? null : Math.round(((close - lo) / span) * 1000) / 10 };
  });
}
