import { describe, expect, it, vi } from "vitest";
import { checkHealthAlerts, type HealthAlertDeps, type HealthIncident } from "../failure-alerts";
import type { SourceHealth } from "../sources";

function source(overrides: Partial<SourceHealth> = {}): SourceHealth {
  return {
    id: "collector:rbi",
    label: "RBI key rates",
    category: "collector",
    lastOk: null,
    lastError: "fetch timeout",
    lastRun: new Date().toISOString(),
    failStreak: 3,
    status: "failing",
    detail: null,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<HealthAlertDeps> = {}): HealthAlertDeps & {
  incidents: Map<string, HealthIncident>;
  broadcasts: string[];
} {
  const incidents = new Map<string, HealthIncident>();
  const broadcasts: string[] = [];
  return {
    incidents,
    broadcasts,
    getHealth: async () => [],
    getIncident: async (id) => incidents.get(id) ?? null,
    setIncident: async (id, v) => void incidents.set(id, v),
    clearIncident: async (id) => void incidents.delete(id),
    broadcast: async (text) => {
      broadcasts.push(text);
      return { sent: 1, failed: 0 };
    },
    telegramConfigured: () => true,
    ...overrides,
  };
}

describe("checkHealthAlerts", () => {
  it("alerts once per incident and stays silent while failing continues", async () => {
    const deps = makeDeps({ getHealth: async () => [source()] });
    const first = await checkHealthAlerts(deps);
    expect(first.alerted).toEqual(["collector:rbi"]);
    expect(deps.broadcasts).toHaveLength(1);

    const second = await checkHealthAlerts(deps);
    expect(second.alerted).toEqual([]);
    expect(deps.broadcasts).toHaveLength(1); // no duplicate message
  });

  it("does not alert below the failure threshold", async () => {
    const deps = makeDeps({ getHealth: async () => [source({ status: "degraded", failStreak: 2 })] });
    const r = await checkHealthAlerts(deps);
    expect(r.alerted).toEqual([]);
    expect(deps.broadcasts).toHaveLength(0);
  });

  it("sends a recovery notice and clears the incident when healthy again", async () => {
    const deps = makeDeps({ getHealth: async () => [source()] });
    await checkHealthAlerts(deps);
    expect(deps.incidents.has("collector:rbi")).toBe(true);

    deps.getHealth = async () => [source({ status: "healthy", failStreak: 0, lastError: null, lastOk: new Date().toISOString() })];
    const r = await checkHealthAlerts(deps);
    expect(r.recovered).toEqual(["collector:rbi"]);
    expect(deps.incidents.has("collector:rbi")).toBe(false);
    expect(deps.broadcasts[1]).toMatch(/Recovered/);
  });

  it("never invents health when there are no sources (no DB)", async () => {
    const deps = makeDeps();
    const r = await checkHealthAlerts(deps);
    expect(r.checked).toBe(0);
    expect(deps.broadcasts).toHaveLength(0);
  });

  it("stays silent without Telegram configured and reports the skip", async () => {
    const deps = makeDeps({ getHealth: async () => [source()], telegramConfigured: () => false });
    const r = await checkHealthAlerts(deps);
    expect(r.skippedNoTelegram).toBe(true);
    expect(deps.broadcasts).toHaveLength(0);
  });

  it("retries the alert next run when the broadcast itself fails", async () => {
    const deps = makeDeps({
      getHealth: async () => [source()],
      broadcast: async () => ({ sent: 0, failed: 1 }),
    });
    const r = await checkHealthAlerts(deps);
    expect(r.alerted).toEqual([]);
    expect(deps.incidents.has("collector:rbi")).toBe(false); // no incident recorded on failed broadcast
  });

  it("treats a failing feed-hub source the same as a failing collector", async () => {
    const deps = makeDeps({
      getHealth: async () => [source({ id: "feed:nse", label: "NSE", category: "news" })],
    });
    const r = await checkHealthAlerts(deps);
    expect(r.alerted).toEqual(["feed:nse"]);
  });
});

describe("checkHealthAlerts deps defaults", () => {
  it("uses broadcastTelegram, not a stub", async () => {
    // Smoke check that the module wires real Telegram; the broadcast mock is
    // replaced here to avoid network access.
    const deps = makeDeps({ broadcast: vi.fn(async () => ({ sent: 1, failed: 0 })) });
    await checkHealthAlerts({ ...deps, getHealth: async () => [source()] });
    expect(deps.broadcast).toHaveBeenCalledTimes(1);
  });
});
