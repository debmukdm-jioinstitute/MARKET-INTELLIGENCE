import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));
const { stateMap } = vi.hoisted(() => ({ stateMap: new Map<string, unknown>() }));

vi.mock("@/lib/feeds/http", () => ({ feedFetch: feedFetchMock }));
vi.mock("@/lib/db", () => ({
  hasDatabase: () => true,
  ensureSchema: async () => {},
  sql: () => async () => [],
}));
vi.mock("@/lib/collector/store", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/collector/store")>();
  return { ...orig, ensureCollectorSchema: async () => {}, latestPoints: async () => [] };
});
vi.mock("@/lib/notify/store", () => ({
  getState: async (k: string) => stateMap.get(k) ?? null,
  setState: async (k: string, v: unknown) => {
    stateMap.set(k, v);
  },
}));

import { buildDataBrief, chunkSections, fmtDate, fmtNum, formatLine, sendDataBrief } from "../telegram-data-brief";

const OLD_ENV = { ...process.env };

function okResponse() {
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

beforeEach(() => {
  process.env = { ...OLD_ENV };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_CHAT_IDS;
  feedFetchMock.mockReset();
  feedFetchMock.mockResolvedValue(okResponse());
  stateMap.clear();
});

describe("fmtNum", () => {
  it("formats magnitudes compactly", () => {
    expect(fmtNum(1234.56)).toBe("1,234.6");
    expect(fmtNum(18.2)).toBe("18.2");
    expect(fmtNum(0.0525)).toBe("0.0525");
    expect(fmtNum(-250)).toBe("-250");
    expect(fmtNum(NaN)).toBe("\u2014");
  });
});

describe("fmtDate", () => {
  it("renders 2026-09-30 as 30 Sep", () => {
    expect(fmtDate("2026-09-30")).toBe("30 Sep");
    expect(fmtDate("2026-01-05")).toBe("5 Jan");
  });
  it("passes through malformed input", () => {
    expect(fmtDate("n/a")).toBe("n/a");
  });
});

const meta = (over: Record<string, unknown> = {}) => ({
  id: "rbi_repo",
  label: "RBI policy repo rate",
  unit: "%",
  provider: "RBI",
  last_ok: new Date().toISOString(),
  last_error: null,
  ...over,
});

describe("formatLine", () => {
  it("shows value, unit, date and delta", () => {
    const line = formatLine(meta(), { date: "2026-09-30", value: 5.5, prev: 5.75 });
    expect(line).toBe("RBI policy repo rate: 5.5% (30 Sep, -0.25 vs prev)");
  });
  it("omits delta when unchanged", () => {
    const line = formatLine(meta(), { date: "2026-09-30", value: 5.5, prev: 5.5 });
    expect(line).toBe("RBI policy repo rate: 5.5% (30 Sep)");
  });
  it("labels stale series honestly", () => {
    const line = formatLine(meta({ last_ok: "2020-01-01T00:00:00Z" }), {
      date: "2020-01-01",
      value: 5.5,
      prev: null,
    });
    expect(line).toContain("\u00B7 stale");
  });
  it("labels failing sources honestly", () => {
    const line = formatLine(meta({ last_error: "timeout", last_ok: "2020-01-01T00:00:00Z" }), {
      date: "2020-01-01",
      value: 5.5,
      prev: null,
    });
    expect(line).toContain("\u00B7 source failing");
  });
});

describe("chunkSections", () => {
  it("keeps small briefs in one message", () => {
    const msgs = chunkSections(
      [{ title: "RBI", lines: [{ id: "a", text: "Repo: 5.50%" }] }],
      "HEADER\n",
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("HEADER");
    expect(msgs[0]).toContain("RBI");
  });
  it("splits oversized briefs and caps message count", () => {
    const lines = Array.from({ length: 500 }, (_, i) => ({ id: `s${i}`, text: `Series ${i}: ${"x".repeat(80)}` }));
    const msgs = chunkSections([{ title: "BIG", lines }], "HEADER\n");
    expect(msgs.length).toBeGreaterThan(1);
    expect(msgs.length).toBeLessThanOrEqual(4);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(4000);
  });
});

describe("sendDataBrief", () => {
  it("is a silent no-op when Telegram is unconfigured", async () => {
    const r = await sendDataBrief();
    expect(r.sent).toBe(false);
    expect(r.skipped).toBe("unconfigured");
    expect(feedFetchMock).not.toHaveBeenCalled();
  });

  it("dedups within the same IST slot", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "t";
    process.env.TELEGRAM_CHAT_ID = "1";
    const now = new Date("2026-10-01T02:00:00Z").getTime(); // 07:30 IST -> am slot
    stateMap.set("telegram_data_brief", { slot: "2026-10-01-am" });
    const r = await sendDataBrief(now);
    expect(r.skipped).toBe("already-sent");
    expect(feedFetchMock).not.toHaveBeenCalled();
  });

  it("reports no-data instead of inventing when the DB is empty", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "t";
    process.env.TELEGRAM_CHAT_ID = "1";
    const r = await sendDataBrief();
    expect(r.sent).toBe(false);
    expect(r.skipped).toBe("no-data");
    expect(feedFetchMock).not.toHaveBeenCalled();
  });
});

describe("buildDataBrief", () => {
  it("returns empty without a database", async () => {
    const b = await buildDataBrief();
    // hasDatabase() is mocked true but there are no series rows (sql mocked -> [])
    expect(b.messages).toEqual([]);
    expect(b.series).toBe(0);
  });
});
