import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));
const { queryResults } = vi.hoisted(() => ({ queryResults: [] as unknown[][] }));
const { stateMap } = vi.hoisted(() => ({ stateMap: new Map<string, unknown>() }));

vi.mock("@/lib/feeds/http", () => ({ feedFetch: feedFetchMock }));
vi.mock("@/lib/db", () => ({
  hasDatabase: () => true,
  ensureSchema: async () => {},
  sql: () => async () => queryResults.shift() ?? [],
}));
vi.mock("@/lib/notify/store", () => ({
  getState: async (k: string) => stateMap.get(k) ?? null,
  setState: async (k: string, v: unknown) => {
    stateMap.set(k, v);
  },
}));
vi.mock("@/lib/hf/summarizer", () => ({
  summarizeItems: async (items: string[]) => items.join(" | "),
}));

import { sendTelegramDigest } from "../telegram-digest";

const OLD_ENV = { ...process.env };
const istDay = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

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
  queryResults.length = 0;
  stateMap.clear();
});

function configure() {
  process.env.TELEGRAM_BOT_TOKEN = "tok";
  process.env.TELEGRAM_CHAT_ID = "123";
}

describe("sendTelegramDigest (dry-run, no real messages)", () => {
  it("is a silent no-op when Telegram is not configured", async () => {
    const r = await sendTelegramDigest();
    expect(r.sent).toBe(false);
    expect(feedFetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing when there is nothing new", async () => {
    configure();
    queryResults.push([], [{ n: 0 }]); // no site events, no fired alerts
    const r = await sendTelegramDigest();
    expect(r).toEqual({ sent: false, events: 0, chats: 0 });
    expect(feedFetchMock).not.toHaveBeenCalled();
    expect(stateMap.has("telegram_digest")).toBe(false); // not marked — a later run may find events
  });

  it("sends a compressed digest of real events and marks the day", async () => {
    configure();
    queryResults.push(
      [{ title: "NIFTY up 2%", body: "Broad rally", href: "/markets", category: "market" }],
      [{ n: 3 }],
    );
    const r = await sendTelegramDigest();
    expect(r.sent).toBe(true);
    expect(r.events).toBe(1);
    expect(r.chats).toBe(1);
    expect(feedFetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(feedFetchMock.mock.calls[0][1].body as string);
    // Payload asserts the send WOULD fire with real content: event text + fired-alert count + deep link.
    expect(body.text).toContain("NIFTY up 2%");
    expect(body.text).toContain("3 user alert rules fired overnight.");
    expect(body.text).toContain("https://getmarketintelligence.in/");
    expect(stateMap.get("telegram_digest")).toEqual({ day: istDay() });
  });

  it("sends at most once per IST day (persistent dedup)", async () => {
    configure();
    stateMap.set("telegram_digest", { day: istDay() });
    queryResults.push([{ title: "X", body: "Y", href: "/markets", category: "market" }], [{ n: 0 }]);
    const r = await sendTelegramDigest();
    expect(r.sent).toBe(false);
    expect(feedFetchMock).not.toHaveBeenCalled();
  });

  it("does not mark the day when every send fails (a later cron run retries)", async () => {
    configure();
    feedFetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    queryResults.push([{ title: "X", body: "Y", href: "/markets", category: "market" }], [{ n: 0 }]);
    const r = await sendTelegramDigest();
    expect(r.sent).toBe(false);
    expect(stateMap.has("telegram_digest")).toBe(false);
  });
});
