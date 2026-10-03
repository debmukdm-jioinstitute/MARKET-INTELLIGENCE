import { describe, expect, it } from "vitest";
import {
  breadthInsight,
  flowInsight,
  isToday,
  marketStatus,
  vixInsight,
} from "../insights";
import { briefHeadlines, mentions, trendingSymbol } from "../brief";
import type { BriefResponse } from "../brief";
import type { Brief } from "@/lib/brief/types";

const at = (time: string) => new Date(`2026-10-05T${time}:00+05:30`);
describe("homepage insight boundaries", () => {
  it.each([
    ["08:59", "Closed — opens in 0h 16m"],
    ["09:00", "Pre-open"],
    ["09:14", "Pre-open"],
    ["09:15", "Live"],
    ["15:29", "Live"],
    ["15:30", "Closed — opens in 17h 45m"],
  ])("shows the correct status at %s IST", (time, status) =>
    expect(marketStatus(at(time)).label).toBe(status),
  );
  it("skips weekends and handles Friday close", () => {
    expect(marketStatus(new Date("2026-10-02T16:00:00+05:30")).label).toBe(
      "Closed — opens in 65h 15m",
    );
    expect(marketStatus(new Date("2026-10-03T10:00:00+05:30")).label).toBe(
      "Closed — opens Monday",
    );
    expect(marketStatus(new Date("2026-10-04T10:00:00+05:30")).label).toBe(
      "Closed — opens Monday",
    );
  });
  it("handles missing breadth, no trades and zero declines", () => {
    expect(breadthInsight(null, null)).toContain("unavailable");
    expect(breadthInsight(0, 0)).toContain("unavailable");
    expect(breadthInsight(2, 1)).toContain("Broad rally");
    expect(breadthInsight(1, 2)).toContain("Narrow fall");
    expect(breadthInsight(1, 1)).toContain("Mixed");
    expect(breadthInsight(10, 0)).toContain("Broad rally");
  });
  it("applies exact VIX thresholds", () => {
    expect(vixInsight(20)).toBe("Fear is normal.");
    expect(vixInsight(13)).toBe("Fear is normal.");
    expect(vixInsight(20.01)).toContain("high");
    expect(vixInsight(12.99)).toContain("low");
    expect(vixInsight()).toContain("unavailable");
  });
  const series = (values: number[]) =>
    values.map((value, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      value,
    }));
  it("explains buying, selling, flips and flat flows without inventing history", () => {
    expect(flowInsight("FIIs", series([-1, 2, 3, 4]), 4)).toContain(
      "3rd straight recorded session",
    );
    expect(flowInsight("DIIs", series([1, -2, -3]), -3)).toContain(
      "sold for the 2nd",
    );
    expect(flowInsight("FIIs", series([-1, -2, 3]), 3)).toContain(
      "turned buyers after 2",
    );
    expect(flowInsight("FIIs", series([1, 2, -3]), -3)).toContain(
      "turned sellers after 2",
    );
    expect(flowInsight("FIIs", series([0]), 0)).toContain("flat");
    expect(flowInsight("FIIs", [], 12)).toContain("History unavailable");
    expect(flowInsight("FIIs", [], null)).toContain("Flow unavailable");
    expect(flowInsight("FIIs", series([1, 2]), 12)).toContain(
      "History unavailable",
    );
  });
  it("finds a prior equal-length run and compares only within available history", () => {
    expect(flowInsight("FIIs", series([1, 2, -1, 1, 2]), 2)).toContain(
      "since 2026-09-02",
    );
    expect(flowInsight("FIIs", series([1, 2, 3]), 3)).toContain(
      "3 available observations",
    );
  });
  it("compares report dates in IST", () => {
    expect(
      isToday("2026-10-02T18:30:00Z", new Date("2026-10-03T01:00:00+05:30")),
    ).toBe(true);
    expect(isToday("invalid", at("10:00"))).toBe(false);
  });
});
describe("brief adapter", () => {
  const brief = (date: string, titles: string[]): Brief => ({
    kind: "pre",
    generatedAt: date,
    headline: "Daily brief",
    items: [],
    watch: [],
    facts: [],
    engine: "rules",
    headlines: titles.map((title) => ({
      title,
      link: "https://example.com/story",
      source: "Test source",
    })),
  });
  it("counts only unique current-day reports for trending symbols", () => {
    const data: BriefResponse = {
      briefs: [
        brief("2026-10-05", [
          "TCS gains",
          "TCS reports earnings",
          "INFY rises",
        ]),
        brief("2026-10-04", ["INFY news", "INFY news two", "INFY third"]),
      ],
    };
    expect(trendingSymbol(data, at("12:00"))).toBe("TCS");
    expect(trendingSymbol(undefined, at("12:00"))).toBeNull();
    expect(briefHeadlines(data)[0].symbols).toContain("TCS");
  });
  it("matches complete names and tokens instead of substrings", () => {
    expect(mentions("Infosys reports earnings", "INFY", "Infosys Ltd.")).toBe(
      true,
    );
    expect(mentions("IRCTC moves higher", "ITC")).toBe(false);
  });
});
