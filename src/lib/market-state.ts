import { STALE_AFTER_MINUTES } from "@/lib/provenance";

export type MarketStateKind = "live" | "delayed" | "closed" | "stale" | "unavailable" | "estimated";

export type MarketState = {
  kind: MarketStateKind;
  /** Short badge text, e.g. "Delayed 15 min". */
  label: string;
  /** Second line of required treatment, e.g. "Last close 15:30:00 IST · Next session Tue 29 Sep, 09:15 IST". */
  detail?: string;
};

const TZ = "Asia/Kolkata";
const OPEN_MIN = 9 * 60 + 15;
const CLOSE_MIN = 15 * 60 + 30;

/** IST wall-clock parts for a UTC instant. */
function ist(now: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { weekday: get("weekday"), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** NSE cash session: Mon–Fri 09:15–15:30 IST. Exchange holidays are not modelled here. */
export function isNseSessionOpen(now = Date.now()): boolean {
  const { weekday, minutes } = ist(now);
  return !["Sat", "Sun"].includes(weekday) && minutes >= OPEN_MIN && minutes < CLOSE_MIN;
}

/** Next weekday 09:15 IST strictly after `now` (ignores exchange holidays). */
export function nextNseSession(now = Date.now()): string {
  const { weekday, minutes } = ist(now);
  let addDays = 1;
  if (!["Sat", "Sun", "Fri"].includes(weekday) && minutes < OPEN_MIN) addDays = 0;
  else if (weekday === "Fri" && minutes < OPEN_MIN) addDays = 0;
  else if (weekday === "Fri") addDays = 3;
  else if (weekday === "Sat") addDays = 2;
  else if (weekday === "Sun") addDays = 1;
  const d = new Date(now + addDays * 86_400_000);
  const label = d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short" });
  return `${label}, 09:15 IST`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "short" })}, ${d.toLocaleTimeString("en-GB", { timeZone: TZ, hour12: false })} IST`;
}

export function resolveMarketState(input: {
  asOf?: string | null;
  /** 0 = provider states real-time; N = stated delay in minutes; omit if unknown. */
  delayMinutes?: number;
  /** NSE-session-bound instrument: outside the session it is "Closed". */
  nseSession?: boolean;
  estimatedMethod?: string;
  unavailableReason?: string;
  now?: number;
}): MarketState {
  const now = input.now ?? Date.now();
  if (input.unavailableReason) return { kind: "unavailable", label: "Unavailable", detail: input.unavailableReason };
  const t = input.asOf ? Date.parse(input.asOf) : NaN;
  const age = Number.isNaN(t) ? null : Math.max(0, Math.round((now - t) / 60_000));
  const last = input.asOf && !Number.isNaN(t) ? fmtTime(input.asOf) : null;

  if (input.estimatedMethod) return { kind: "estimated", label: "Estimated", detail: `Method: ${input.estimatedMethod}` };
  if (input.nseSession && !isNseSessionOpen(now)) {
    return { kind: "closed", label: "Closed", detail: `${last ? `Last close ${last} · ` : ""}Next session ${nextNseSession(now)}` };
  }
  if (age == null) return { kind: "unavailable", label: "No timestamp", detail: "The provider did not return a time for this value. Report an issue if it looks wrong." };
  if (input.delayMinutes === 0) return { kind: "live", label: "Live", detail: `Updated ${age < 1 ? "<1" : age} min ago` };
  if (input.delayMinutes && input.delayMinutes > 0) return { kind: "delayed", label: `Delayed ${input.delayMinutes} min` };
  if (age > STALE_AFTER_MINUTES) {
    return { kind: "stale", label: "Stale", detail: `Warning: last successful value${last ? ` at ${last}` : ""} (${age >= 120 ? `${Math.round(age / 60)}h` : `${age} min`} old)` };
  }
  return { kind: "delayed", label: `Updated ${age < 1 ? "<1" : age} min ago` };
}
