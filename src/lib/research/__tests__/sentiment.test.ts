import { describe, expect, it } from "vitest";
import { buildDigest, overlaySeries, quadrantOf, type DailyRow } from "@/lib/research/sentiment";

const row = (day: string, source: DailyRow["source"], mentions: number, bullishShare: number | null, topics: string[] | null = null): DailyRow => ({ day, source, mentions, volumeZ: null, sentimentMean: null, sentimentVelocity: null, buzzing: false, bullishShare, topics });

describe("digest", () => {
  const asOf = new Date("2026-10-03T12:00:00Z");
  const rows = [row("2026-10-02", "reddit", 100, 0.7, ["order wins"]), row("2026-10-01", "reddit", 27, 0.4, ["order wins", "margins"]), row("2026-09-20", "reddit", 500, 0.1), row("2026-09-25", "telegram", 10, null)];
  const d = buildDigest(rows, asOf);
  it("weights bullish share by mentions and ignores rows older than 7 days", () => {
    const r = d.find((x) => x.source === "reddit")!;
    expect(r.mentions).toBe(127);
    expect(r.bullishPct).toBe(64); // (0.7*100 + 0.4*27) / 127 = 63.6%
    expect(r.themes[0]).toBe("order wins");
    expect(r.live).toBe(true);
  });
  it("marks stale or empty sources as not live and leaves unscored sentiment null", () => {
    expect(d.find((x) => x.source === "telegram")).toMatchObject({ live: false, mentions: 0, bullishPct: null });
    expect(d.find((x) => x.source === "youtube")).toMatchObject({ live: false, lastDay: null });
  });
});

describe("quadrants and overlay", () => {
  it("classifies busy/quiet and happy/unhappy", () => {
    expect(quadrantOf({ volumeZ: 3, sentiment: -0.4 })).toBe("talked-down");
    expect(quadrantOf({ volumeZ: 3, sentiment: 0.4 })).toBe("talked-up");
    expect(quadrantOf({ volumeZ: 0, sentiment: 0.1 })).toBe("quiet-happy");
  });
  it("normalises price to 0-100 and aligns it to weekly trend dates without inventing prices", () => {
    const o = overlaySeries(
      [{ d: "2026-01-04", v: 20 }, { d: "2026-01-11", v: 100 }],
      [{ ts: "2025-12-01T00:00:00Z", close: 10 }, { ts: "2026-01-05T00:00:00Z", close: 100 }, { ts: "2026-01-09T00:00:00Z", close: 200 }],
    );
    expect(o[0].price).toBeNull(); // no close on/before the first trend date inside the window → no invented price
    expect(o[1].price).toBe(100);
    expect(overlaySeries([{ d: "2026-01-04", v: 1 }], [])[0].price).toBeNull();
  });
});
