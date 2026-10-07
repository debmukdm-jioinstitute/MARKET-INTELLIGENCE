import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = [
  {
    id: 1,
    broker: "Motilal Oswal",
    symbol: "HDFCBANK",
    title: "Q2 preview",
    recommendation: "BUY",
    target_price: 2000,
    url: "https://example.com/n",
    pdf_url: null,
    scraped_at: new Date().toISOString(),
  },
];

vi.mock("../../db", () => ({
  hasDatabase: () => true,
  ensureSchema: async () => undefined,
  sql: () => async () => rows,
}));

const sentiment = vi.fn();
vi.mock("../../reddit-sentiment/live-cache", () => ({
  getWatchlistLiveSentiment: () => sentiment(),
}));

import { detectFeedUpdates } from "../detect-feeds";

describe("Live Feed Update Notifications Detector", () => {
  beforeEach(() => {
    sentiment.mockReset();
  });

  it("emits broker + high-severity reddit events from real inputs only", async () => {
    sentiment.mockResolvedValue([
      { symbol: "RELIANCE", totalMentions7D: 20, netSentimentScore: 3 },
      { symbol: "TCS", totalMentions7D: 9, netSentimentScore: -1 },
      { symbol: "INFY", totalMentions7D: 2, netSentimentScore: 0 },
    ]);
    const events = await detectFeedUpdates();

    const categories = new Set(events.map((e) => e.category));
    expect(categories.has("broker")).toBe(true);
    expect(categories.has("ai")).toBe(true);
    // Fabricated-feed categories were removed — they must never come back.
    for (const c of ["promoter", "credit", "funds"]) expect(categories.has(c as never)).toBe(false);

    for (const ev of events) {
      expect(ev.key).toBeDefined();
      expect(ev.title.length).toBeGreaterThan(0);
      expect(ev.body.length).toBeGreaterThan(0);
      expect(ev.href.startsWith("/") || ev.href.startsWith("http")).toBe(true);
      expect(["high", "medium", "info"]).toContain(ev.severity);
    }
    const reddit = events.filter((e) => e.category === "ai");
    expect(reddit).toHaveLength(2); // INFY (2 mentions) is below the threshold
    expect(reddit.find((e) => e.key.includes("RELIANCE"))?.severity).toBe("high");
    expect(reddit.find((e) => e.key.includes("TCS"))?.severity).toBe("medium");
  });

  it("emits nothing for reddit when the live fetch fails", async () => {
    sentiment.mockRejectedValue(new Error("network down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const events = await detectFeedUpdates();
    expect(events.every((e) => e.category !== "ai")).toBe(true);
    err.mockRestore();
  });
});
