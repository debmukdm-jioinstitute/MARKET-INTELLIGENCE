/** Calendar and reward rules. No browser dependencies; callers may inject a clock/store. */
export const MISSION_IDS = ["read-brief", "run-scan", "open-debate"] as const;
export type MissionId = (typeof MISSION_IDS)[number];
export type WelcomeStep = "read-brief" | "run-scan" | "track-stock";
export type BonusId = "paper-trader" | "first-alert";
export type MissionStore = {
  [key: string]: unknown;
  xp: number;
  streak: number;
  lastCountedDate: string | null;
  badges: string[];
  welcomeSteps: WelcomeStep[];
  visits: string[];
  bonuses: BonusId[];
  firstStepsCelebrated: boolean;
};
const DAY = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const WELCOME: WelcomeStep[] = ["read-brief", "run-scan", "track-stock"];

export function getISTDate(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function emptyStore(): MissionStore {
  return {
    xp: 0,
    streak: 0,
    lastCountedDate: null,
    badges: [],
    welcomeSteps: [],
    visits: [],
    bonuses: [],
    firstStepsCelebrated: false,
  };
}

export function parseStore(raw: string | null): MissionStore {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value))
      return emptyStore();
    const input = value as Record<string, unknown>;
    const store = emptyStore();
    store.xp =
      typeof input.xp === "number" && Number.isFinite(input.xp)
        ? Math.max(0, Math.floor(input.xp))
        : 0;
    store.badges = strings(input.badges);
    store.visits = strings(input.visits).filter((d) => DATE.test(d));
    store.bonuses = strings(input.bonuses).filter(
      (b): b is BonusId => b === "paper-trader" || b === "first-alert",
    );
    store.welcomeSteps = strings(input.welcomeSteps).filter(
      (s): s is WelcomeStep => WELCOME.includes(s as WelcomeStep),
    );
    store.firstStepsCelebrated = input.firstStepsCelebrated === true;
    store.lastCountedDate =
      typeof input.lastCountedDate === "string" &&
      DATE.test(input.lastCountedDate)
        ? input.lastCountedDate
        : null;
    for (const [date, missions] of Object.entries(input)) {
      if (DATE.test(date))
        store[date] = strings(missions).filter((m) =>
          MISSION_IDS.includes(m as MissionId),
        );
    }
    store.streak =
      typeof input.streak === "number" && Number.isFinite(input.streak)
        ? Math.max(0, Math.floor(input.streak))
        : 0;
    return store;
  } catch {
    return emptyStore();
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === "string"))]
    : [];
}

export function missionsOn(
  store: MissionStore,
  date = getISTDate(),
): MissionId[] {
  return strings(store[date]).filter((m): m is MissionId =>
    MISSION_IDS.includes(m as MissionId),
  );
}

function previousDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - DAY)
    .toISOString()
    .slice(0, 10);
}

export function computeStreak(store: MissionStore, now = new Date()): number {
  const today = getISTDate(now);
  let cursor = missionsOn(store, today).length ? today : previousDate(today);
  let count = 0;
  while (missionsOn(store, cursor).length) {
    count++;
    cursor = previousDate(cursor);
  }
  return count;
}

export function addXP(store: MissionStore, n: number): MissionStore {
  return Number.isFinite(n) && n > 0
    ? { ...store, xp: store.xp + Math.floor(n) }
    : store;
}

export const LEVELS = [
  { name: "Explorer", min: 0, next: 100 },
  { name: "Researcher", min: 100, next: 300 },
  { name: "Analyst", min: 300, next: 600 },
  { name: "Strategist", min: 600, next: null },
] as const;

export function levelForXP(xp: number) {
  return [...LEVELS].reverse().find((l) => xp >= l.min) ?? LEVELS[0];
}

export function awardBadges(
  store: MissionStore,
  now = new Date(),
): MissionStore {
  let next = {
    ...store,
    badges: [...store.badges],
    streak: computeStreak(store, now),
  };
  if (
    WELCOME.every((step) => store.welcomeSteps.includes(step)) &&
    !next.badges.includes("first-steps")
  ) {
    next = addXP(next, 60);
    next.badges.push("first-steps");
  }
  if (next.streak >= 7 && !next.badges.includes("streak-7"))
    next.badges.push("streak-7");
  if (
    next.bonuses.includes("paper-trader") &&
    !next.badges.includes("paper-trader")
  )
    next.badges.push("paper-trader");
  const debates = Object.keys(store).filter(
    (d) => DATE.test(d) && missionsOn(store, d).includes("open-debate"),
  ).length;
  if (debates >= 5 && !next.badges.includes("debater"))
    next.badges.push("debater");
  return next;
}

export function creditWelcomeStep(
  store: MissionStore,
  step: WelcomeStep,
  now = new Date(),
): MissionStore {
  if (store.welcomeSteps.includes(step)) return store;
  return awardBadges(
    { ...store, welcomeSteps: [...store.welcomeSteps, step] },
    now,
  );
}

export function creditMission(
  store: MissionStore,
  missionId: MissionId,
  now = new Date(),
): MissionStore {
  const date = getISTDate(now);
  const done = missionsOn(store, date);
  if (done.includes(missionId)) return store;
  let next = addXP(
    { ...store, [date]: [...done, missionId], lastCountedDate: date },
    20,
  );
  if (missionId === "read-brief" || missionId === "run-scan")
    next = creditWelcomeStep(next, missionId, now);
  return awardBadges(next, now);
}

export function creditVisit(
  store: MissionStore,
  now = new Date(),
): MissionStore {
  const date = getISTDate(now);
  if (store.visits.includes(date)) return store;
  return addXP(
    {
      ...store,
      visits: [...store.visits, date],
      streak: computeStreak(store, now),
    },
    10,
  );
}

/** These are homepage exploration rewards, credited on navigation per the brief. */
export function creditBonus(
  store: MissionStore,
  bonus: BonusId,
  now = new Date(),
): MissionStore {
  if (store.bonuses.includes(bonus)) return store;
  return awardBadges(
    addXP({ ...store, bonuses: [...store.bonuses, bonus] }, 30),
    now,
  );
}

export function hasCompletedAllMissions(store: MissionStore): boolean {
  return Object.keys(store).some(
    (d) => DATE.test(d) && missionsOn(store, d).length === MISSION_IDS.length,
  );
}
