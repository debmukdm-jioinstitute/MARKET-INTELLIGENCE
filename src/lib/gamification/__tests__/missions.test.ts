import { describe, expect, it } from "vitest";
import {
  addXP,
  awardBadges,
  computeStreak,
  creditBonus,
  creditMission,
  creditVisit,
  creditWelcomeStep,
  emptyStore,
  getISTDate,
  hasCompletedAllMissions,
  levelForXP,
  missionsOn,
  parseStore,
} from "../missions";

const day = (date: string) => new Date(`${date}T10:00:00+05:30`);
describe("IST missions", () => {
  it("changes dates at midnight IST, not UTC", () => {
    const before = new Date("2026-10-02T18:29:59Z"),
      after = new Date("2026-10-02T18:30:00Z");
    expect(getISTDate(before)).toBe("2026-10-02");
    expect(getISTDate(after)).toBe("2026-10-03");
    const s = creditMission(
      creditMission(emptyStore(), "read-brief", before),
      "read-brief",
      after,
    );
    expect(s.xp).toBe(40);
    expect(s.streak).toBe(2);
    expect(missionsOn(s, "2026-10-03")).toEqual(["read-brief"]);
  });
  it("is immutable and prevents double click rewards", () => {
    const original = emptyStore();
    const one = creditMission(original, "run-scan", day("2026-10-03"));
    expect(creditMission(one, "run-scan", day("2026-10-03"))).toBe(one);
    expect(original.xp).toBe(0);
    expect(one.xp).toBe(20);
    expect(one.streak).toBe(1);
  });
  it("preserves yesterday's streak until a whole day is missed", () => {
    const s = creditMission(emptyStore(), "read-brief", day("2026-10-01"));
    expect(computeStreak(s, day("2026-10-02"))).toBe(1);
    expect(computeStreak(s, day("2026-10-03"))).toBe(0);
    expect(creditMission(s, "open-debate", day("2026-10-03")).streak).toBe(1);
  });
  it("handles month and year boundaries", () => {
    let s = creditMission(emptyStore(), "read-brief", day("2026-12-31"));
    s = creditMission(s, "run-scan", day("2027-01-01"));
    expect(s.streak).toBe(2);
  });
  it("awards visit XP once but a visit alone never counts toward the streak", () => {
    const s = creditVisit(emptyStore(), day("2026-10-03"));
    expect(creditVisit(s, day("2026-10-03")).xp).toBe(10);
    expect(computeStreak(s, day("2026-10-03"))).toBe(0);
    expect(creditVisit(s, day("2026-10-04")).xp).toBe(20);
  });
  it.each([
    [0, "Explorer"],
    [99, "Explorer"],
    [100, "Researcher"],
    [299, "Researcher"],
    [300, "Analyst"],
    [599, "Analyst"],
    [600, "Strategist"],
  ])("maps %i XP to %s", (xp, name) => {
    expect(levelForXP(Number(xp)).name).toBe(name);
  });
  it("awards First Steps only for the three welcome steps, once", () => {
    let s = emptyStore();
    for (const mission of ["read-brief", "run-scan", "open-debate"] as const)
      s = creditMission(s, mission, day("2026-10-03"));
    expect(s.badges).not.toContain("first-steps");
    expect(hasCompletedAllMissions(s)).toBe(true);
    s = creditWelcomeStep(s, "track-stock", day("2026-10-03"));
    expect(s.badges).toContain("first-steps");
    expect(s.xp).toBe(120);
    expect(awardBadges(s, day("2026-10-03")).xp).toBe(120);
  });
  it("awards streak and debate badges from counted daily actions", () => {
    let s = emptyStore();
    for (let n = 1; n <= 7; n++)
      s = creditMission(s, "open-debate", day(`2026-10-0${n}`));
    expect(s.streak).toBe(7);
    expect(s.badges).toEqual(expect.arrayContaining(["debater", "streak-7"]));
    expect(s.xp).toBe(140);
  });
  it("credits exploration bonuses once and keeps them separate from daily missions", () => {
    let s = creditBonus(emptyStore(), "paper-trader", day("2026-10-03"));
    s = creditBonus(s, "paper-trader", day("2026-10-04"));
    s = creditBonus(s, "first-alert", day("2026-10-04"));
    expect(s.xp).toBe(60);
    expect(s.badges).toContain("paper-trader");
    expect(s.streak).toBe(0);
  });
  it("recovers safely from malformed storage and restores dated missions", () => {
    expect(parseStore("broken")).toEqual(emptyStore());
    expect(parseStore("[]")).toEqual(emptyStore());
    const s = parseStore(
      JSON.stringify({
        xp: -1,
        badges: {},
        "2026-10-03": ["read-brief", "read-brief", "bogus"],
      }),
    );
    expect(s.xp).toBe(0);
    expect(missionsOn(s, "2026-10-03")).toEqual(["read-brief"]);
    expect(computeStreak(s, day("2026-10-03"))).toBe(1);
  });
  it("ignores invalid XP", () => {
    expect(addXP(emptyStore(), NaN).xp).toBe(0);
    expect(addXP(emptyStore(), -20).xp).toBe(0);
  });
});
