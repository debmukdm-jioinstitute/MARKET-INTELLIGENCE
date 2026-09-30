import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));

vi.mock("@/lib/feeds/http", () => ({ feedFetch: feedFetchMock }));

import {
  broadcastTelegram,
  formatEventMessage,
  getTelegramChatIds,
  hasTelegramConfigured,
  sendTelegramMessage,
  truncate,
} from "../telegram";

const OLD_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...OLD_ENV };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_CHAT_IDS;
  feedFetchMock.mockReset();
});

function okResponse() {
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

describe("telegram config", () => {
  it("is not configured without a token", () => {
    process.env.TELEGRAM_CHAT_ID = "123";
    expect(hasTelegramConfigured()).toBe(false);
  });

  it("is not configured without any chat id", () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    expect(hasTelegramConfigured()).toBe(false);
  });

  it("parses comma-separated chat ids and falls back to the singular var", () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_IDS = " 111, 222 ,,333 ";
    expect(getTelegramChatIds()).toEqual(["111", "222", "333"]);
    expect(hasTelegramConfigured()).toBe(true);
    delete process.env.TELEGRAM_CHAT_IDS;
    process.env.TELEGRAM_CHAT_ID = "999";
    expect(getTelegramChatIds()).toEqual(["999"]);
  });
});

describe("formatEventMessage", () => {
  it("renders title, body and a deep link as plain text", () => {
    const msg = formatEventMessage({ title: "Spike", body: "NIFTY up", href: "/markets", severity: "high" });
    expect(msg).toContain("Spike");
    expect(msg).toContain("NIFTY up");
    expect(msg).toContain("https://getmarketintelligence.in/markets");
    expect(msg).not.toContain("<b>");
  });

  it("truncates to Telegram's 4096-char limit", () => {
    expect(truncate("x".repeat(5000)).length).toBeLessThanOrEqual(4096);
    expect(truncate("short")).toBe("short");
  });
});

describe("sendTelegramMessage", () => {
  it("POSTs the Bot API payload and honours ok:true", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    feedFetchMock.mockResolvedValue(okResponse());
    const r = await sendTelegramMessage("123", "hello");
    expect(r.ok).toBe(true);
    expect(feedFetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = feedFetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bottok/sendMessage");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ chat_id: "123", text: "hello", disable_web_page_preview: true });
  });

  it("returns ok:false on non-ok HTTP and never throws on network failure", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    feedFetchMock.mockResolvedValue(new Response("{}", { status: 429 }));
    expect((await sendTelegramMessage("123", "hi")).ok).toBe(false);
    feedFetchMock.mockRejectedValue(new Error("boom"));
    expect((await sendTelegramMessage("123", "hi")).ok).toBe(false);
  });

  it("is a no-op without a token or with empty text", async () => {
    expect((await sendTelegramMessage("123", "hi")).ok).toBe(false);
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    expect((await sendTelegramMessage("123", "   ")).ok).toBe(false);
    expect(feedFetchMock).not.toHaveBeenCalled();
  });
});

describe("broadcastTelegram", () => {
  it("fans out to every configured chat", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_IDS = "111,222";
    feedFetchMock.mockImplementation(() => Promise.resolve(okResponse())); // fresh Response per call — bodies are single-use
    const r = await broadcastTelegram("news");
    expect(r).toEqual({ sent: 2, failed: 0 });
    const chats = feedFetchMock.mock.calls.map((c) => JSON.parse(c[1].body as string).chat_id);
    expect(chats).toEqual(["111", "222"]);
  });

  it("counts failures per chat and never throws", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_IDS = "111,222";
    feedFetchMock
      .mockResolvedValueOnce(okResponse())
      .mockRejectedValueOnce(new Error("down"));
    const r = await broadcastTelegram("news");
    expect(r).toEqual({ sent: 1, failed: 1 });
  });

  it("sends nothing when unconfigured or text is empty", async () => {
    expect(await broadcastTelegram("news")).toEqual({ sent: 0, failed: 0 });
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_IDS = "111";
    expect(await broadcastTelegram("   ")).toEqual({ sent: 0, failed: 0 });
    expect(feedFetchMock).not.toHaveBeenCalled();
  });
});
