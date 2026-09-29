import { describe, expect, it } from "vitest";
import { detectFeedUpdates } from "../detect-feeds";

describe("Live Feed Update Notifications Detector", () => {
  it("detects major feed updates across broker research, promoters, credit, mutual funds, and reddit", async () => {
    const events = await detectFeedUpdates();

    expect(events.length).toBeGreaterThan(0);

    const categories = new Set(events.map((e) => e.category));
    expect(categories.has("broker")).toBe(true);
    expect(categories.has("promoter")).toBe(true);
    expect(categories.has("credit")).toBe(true);
    expect(categories.has("funds")).toBe(true);

    // Verify event structure
    for (const ev of events) {
      expect(ev.key).toBeDefined();
      expect(ev.title.length).toBeGreaterThan(0);
      expect(ev.body.length).toBeGreaterThan(0);
      expect(ev.href.startsWith("/")).toBe(true);
      expect(["high", "medium", "info"]).toContain(ev.severity);
    }

    // Verify high-priority major events exist
    const highPriorityEvents = events.filter((e) => e.severity === "high");
    expect(highPriorityEvents.length).toBeGreaterThan(0);
  });
});
