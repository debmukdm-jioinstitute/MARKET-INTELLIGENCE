/**
 * XP catalog — the server owns every point value.
 * Clients only ever send the action name; point values from the client are ignored.
 */

export type XpFrequency = "once" | "daily" | "repeat";

export interface XpActionDef {
  points: number;
  label: string;
  frequency: XpFrequency;
}

export const XP_CATALOG: Record<string, XpActionDef> = {
  first_debate_asked: { points: 25, label: "Asked your first AI debate question", frequency: "once" },
  debate_completed: { points: 20, label: "Watched a full AI debate", frequency: "repeat" },
  first_scan: { points: 10, label: "Ran your first scan", frequency: "once" },
  scan_quest_daily: { points: 25, label: "Completed the daily scan quest", frequency: "daily" },
  first_backtest: { points: 25, label: "Ran your first backtest", frequency: "once" },
  personal_best: { points: 15, label: "Set a new personal best", frequency: "repeat" },
  first_alert_created: { points: 15, label: "Created your first alert", frequency: "once" },
  alert_coverage_3: { points: 20, label: "Have 3 rules watching the market", frequency: "once" },
  first_flag_spotted: { points: 10, label: "Spotted your first options flag", frequency: "once" },
  daily_checkin: { points: 5, label: "Checked the daily options flags", frequency: "daily" },
};

export interface XpLevel {
  name: string;
  min: number;
}

/** Level thresholds — exported so UI agents build against the same source of truth. */
export const LEVELS: XpLevel[] = [
  { name: "Explorer", min: 0 },
  { name: "Learner", min: 100 },
  { name: "Analyst", min: 300 },
  { name: "Strategist", min: 700 },
];

/** Level name for a lifetime XP total. */
export function levelFor(total: number): string {
  let level = LEVELS[0].name;
  for (const l of LEVELS) {
    if (total >= l.min) level = l.name;
  }
  return level;
}

/**
 * Progress toward the next level.
 * Returns nextLevel: null and progressPct: 100 at the top level.
 */
export function levelProgress(total: number): { level: string; nextLevel: string | null; progressPct: number } {
  const level = levelFor(total);
  const idx = LEVELS.findIndex((l) => l.name === level);
  const next = LEVELS[idx + 1];
  if (!next) return { level, nextLevel: null, progressPct: 100 };
  const span = next.min - LEVELS[idx].min;
  const pct = span > 0 ? ((total - LEVELS[idx].min) / span) * 100 : 100;
  return { level, nextLevel: next.name, progressPct: Math.max(0, Math.min(100, Math.round(pct * 10) / 10)) };
}
