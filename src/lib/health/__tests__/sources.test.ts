import { describe, expect, it } from "vitest";
import {
  collectorStatusFrom,
  FAILURE_THRESHOLD,
  feedCategoryFor,
  feedHealthToResults,
  feedStatusFrom,
} from "../sources";

describe("collectorStatusFrom", () => {
  it("marks streak >= threshold as failing", () => {
    const r = collectorStatusFrom(
      { last_error: "boom", last_run: new Date().toISOString(), fail_streak: FAILURE_THRESHOLD },
      null,
    );
    expect(r.status).toBe("failing");
    expect(r.failStreak).toBe(FAILURE_THRESHOLD);
  });

  it("marks small streaks as degraded, not failing", () => {
    const r = collectorStatusFrom(
      { last_error: "boom", last_run: new Date().toISOString(), fail_streak: 2 },
      null,
    );
    expect(r.status).toBe("degraded");
  });

  it("treats recent series success with no failure row as healthy", () => {
    const r = collectorStatusFrom(null, new Date().toISOString());
    expect(r.status).toBe("healthy");
    expect(r.failStreak).toBe(0);
  });

  it("treats stale series success with no failure row as unknown, not healthy", () => {
    // Never claim healthy without a recent recorded run.
    const old = new Date(Date.now() - 72 * 3_600_000).toISOString();
    expect(collectorStatusFrom(null, old).status).toBe("unknown");
    expect(collectorStatusFrom(null, null).status).toBe("unknown");
  });
});

describe("feedStatusFrom", () => {
  const base = { last_ok: new Date().toISOString(), last_error: null, last_run: new Date().toISOString(), fail_streak: 0 };
  it("healthy on clean recorded run", () => expect(feedStatusFrom(base).valueOf()).toBe("healthy"));
  it("failing at threshold", () => expect(feedStatusFrom({ ...base, fail_streak: FAILURE_THRESHOLD })).toBe("failing"));
  it("degraded on last error below threshold", () =>
    expect(feedStatusFrom({ ...base, last_error: "timeout", fail_streak: 1 })).toBe("degraded"));
  it("unknown when never recorded", () =>
    expect(feedStatusFrom({ ...base, last_run: null, last_ok: null })).toBe("unknown"));
});

describe("feedHealthToResults", () => {
  it("maps not-configured sources to ok with a Not configured detail (no failure streak)", () => {
    const [r] = feedHealthToResults([
      { id: "massive", label: "Massive", ok: false, message: "Set MASSIVE_API_KEY on Vercel (Production)" },
    ]);
    expect(r.id).toBe("feed:massive");
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
    expect(r.detail).toMatch(/^Not configured/);
  });

  it("records genuine failures with the error", () => {
    const [r] = feedHealthToResults([{ id: "nse", label: "NSE", ok: false, message: "fetch timeout" }]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("fetch timeout");
  });

  it("maps feed ids to categories", () => {
    expect(feedCategoryFor("yahoo")).toBe("quotes");
    expect(feedCategoryFor("fred")).toBe("macro");
    expect(feedCategoryFor("nse")).toBe("news");
    expect(feedCategoryFor("something-new")).toBe("news");
  });
});
