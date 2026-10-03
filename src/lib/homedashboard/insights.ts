import { getISTDate } from "@/lib/gamification/missions";

export function marketStatus(now: Date) {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const day = ist.getUTCDay();
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  if (day === 0 || day === 6)
    return { state: "closed", label: "Closed — opens Monday" };
  if (minutes >= 540 && minutes < 555)
    return { state: "pre-open", label: "Pre-open" };
  if (minutes >= 555 && minutes < 930) return { state: "live", label: "Live" };
  let days = minutes < 555 ? 0 : 1;
  while ((day + days) % 7 === 0 || (day + days) % 7 === 6) days++;
  const wait = days * 1440 + 555 - minutes;
  return {
    state: "closed",
    label: `Closed — opens in ${Math.floor(wait / 60)}h ${wait % 60}m`,
  };
}

export function breadthInsight(
  advances?: number | null,
  declines?: number | null,
) {
  if (
    advances == null ||
    declines == null ||
    advances < 0 ||
    declines < 0 ||
    advances + declines === 0
  )
    return "Breadth unavailable — participation cannot be assessed yet.";
  const ratio = declines === 0 ? Infinity : advances / declines;
  return ratio >= 2
    ? "Broad rally — most stocks participating, healthy."
    : ratio <= 0.5
      ? "Narrow fall — selling is widespread, be careful."
      : "Mixed — stock-pickers’ market.";
}

export function vixInsight(value?: number | null) {
  return value == null
    ? "VIX unavailable — volatility cannot be assessed yet."
    : value > 20
      ? "Fear is high — expect sharp swings."
      : value < 13
        ? "Fear is low — calm now, but calm markets snap fast."
        : "Fear is normal.";
}

export type FlowPoint = { date: string; value: number };
function ordinal(n: number) {
  return `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th")}`;
}
export function flowInsight(
  label: string,
  history: FlowPoint[] = [],
  today?: number | null,
) {
  const points = [
    ...new Map(
      history.filter((p) => Number.isFinite(p.value)).map((p) => [p.date, p]),
    ).values(),
  ].sort((a, b) => b.date.localeCompare(a.date));
  if (!points.length || (today != null && today !== points[0].value))
    return today == null
      ? "Flow unavailable — waiting for the latest report."
      : `${label} are net ${today > 0 ? "buyers" : today < 0 ? "sellers" : "flat"}. History unavailable for a streak comparison.`;
  const sign = Math.sign(points[0].value);
  if (!sign) return `${label} were flat in the latest reported session.`;
  let streak = 0;
  while (streak < points.length && Math.sign(points[streak].value) === sign)
    streak++;
  if (streak === 1) {
    let previous = 0;
    while (
      previous + 1 < points.length &&
      Math.sign(points[previous + 1].value) === -sign
    )
      previous++;
    return previous
      ? `${label} turned ${sign > 0 ? "buyers" : "sellers"} after ${previous} recorded ${previous === 1 ? "session" : "sessions"} of ${sign > 0 ? "selling" : "buying"}.`
      : `${label} ${sign > 0 ? "bought" : "sold"} in the latest session. More history is needed for a pattern.`;
  }
  let earlierRun = 0;
  let since: string | null = null;
  for (let i = streak; i < points.length; i++) {
    earlierRun = Math.sign(points[i].value) === sign ? earlierRun + 1 : 0;
    if (earlierRun >= streak) {
      since = points[i - earlierRun + 1].date;
      break;
    }
  }
  // Stored observations can have gaps; never claim complete exchange-session coverage.
  return `${label} ${sign > 0 ? "bought" : "sold"} for the ${ordinal(streak)} straight recorded session — ${since ? `longest run since ${since}` : `longest run in ${points.length} available observations`}.`;
}

export function isToday(iso: string | null | undefined, now: Date) {
  if (!iso) return false;
  // A date-only value is already an exchange calendar date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso === getISTDate(now);
  const date = new Date(iso);
  return (
    Number.isFinite(date.getTime()) && getISTDate(date) === getISTDate(now)
  );
}
