import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));
const { stateMap } = vi.hoisted(() => ({ stateMap: new Map<string, unknown>() }));

vi.mock("@/lib/feeds/http", () => ({ feedFetch: feedFetchMock }));
vi.mock("@/lib/db", () => ({
  hasDatabase: () => true,
  ensureSchema: async () => {},
  sql: () => async () => [],
}));
vi.mock("../store", () => ({
  addEvents: async (events: unknown[]) => events, // every event is "new"
  deletePushSubscription: async () => {},
  getState: async (k: string) => stateMap.get(k) ?? null,
  setState: async (k: string, v: unknown) => {
    stateMap.set(k, v);
  },
  listPushTargets: async () => [],
}));
vi.mock("../admin/push", () => ({ hasPushConfigured: () => false }));

import { publishEvents } from "../publish";

const OLD_ENV = { ...process.env };
const istDay = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function okResponse() {
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

const highEvent = {
  key: "k-high-1",
  category: "market",
  severity: "high",
  title: "India VIX above 20",
  body: "Volatility spike",
  href: "/markets",
} as const;

beforeEach(() => {
  process.env = { ...OLD_ENV };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_CHAT_IDS;
  feedFetchMock.mockReset();
  feedFetchMock.mockResolvedValue(okResponse());
  stateMap.clear();
});

describe("publishEvents Telegram broadcast", () => {
  it("sends high-severity new events to the owner's Telegram chats", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_ID = "123";
    const n = await publishEvents([highEvent]);
    expect(n).toBe(1);
    expect(feedFetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(feedFetchMock.mock.calls[0][1].body as string);
    expect(body.text).toContain("India VIX above 20");
    expect(body.text).toContain("https://getmarketintelligence.in/markets");
    expect(stateMap.get("telegram_count")).toEqual({ day: istDay(), n: 1 });
  });

  it("never sends medium/info events", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_ID = "123";
    await publishEvents([{ ...highEvent, key: "k-med", severity: "medium" }]);
    expect(feedFetchMock).not.toHaveBeenCalled();
  });

  it("respects the daily cap so a runaway detector cannot spam", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_ID = "123";
    stateMap.set("telegram_count", { day: istDay(), n: 6 });
    await publishEvents([highEvent]);
    expect(feedFetchMock).not.toHaveBeenCalled();
  });

  it("is a no-op when Telegram is unconfigured", async () => {
    await publishEvents([highEvent]);
    expect(feedFetchMock).not.toHaveBeenCalled();
  });
});
