import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));

vi.mock("@/lib/feeds/http", () => ({
  feedFetch: feedFetchMock,
}));

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("nseJson session", () => {
  beforeEach(() => {
    vi.resetModules();
    feedFetchMock.mockReset();
  });

  it("calls the API first and succeeds without a homepage warmup", async () => {
    feedFetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/api/corporate-announcements")) return jsonOk([{ seq: 1 }]);
      throw new Error(`unexpected ${url}`);
    });
    const { nseJson } = await import("@/lib/feeds/india/nse-session");
    await expect(nseJson("/api/corporate-announcements?index=equities")).resolves.toEqual([{ seq: 1 }]);
    expect(feedFetchMock).toHaveBeenCalledTimes(1);
    expect(String(feedFetchMock.mock.calls[0]![0])).toContain("/api/corporate-announcements");
  });

  it("does not fail the job when homepage warmup hangs after a 403", async () => {
    let apiCalls = 0;
    feedFetchMock.mockImplementation(async (url: string) => {
      if (String(url) === "https://www.nseindia.com") {
        throw new DOMException("The operation was aborted due to timeout", "AbortError");
      }
      if (String(url).includes("/api/fiidiiTradeReact")) {
        apiCalls += 1;
        if (apiCalls === 1) return new Response("denied", { status: 403 });
        return jsonOk({ data: [{ category: "FII" }] });
      }
      return new Response("no", { status: 404 });
    });
    const { nseJson } = await import("@/lib/feeds/india/nse-session");
    await expect(nseJson("/api/fiidiiTradeReact")).resolves.toEqual({ data: [{ category: "FII" }] });
  });

  it("retries when NSE returns an HTML WAF page", async () => {
    let apiCalls = 0;
    feedFetchMock.mockImplementation(async (url: string) => {
      if (String(url) === "https://www.nseindia.com") {
        return new Response("denied", { status: 403, headers: { "set-cookie": "AKA_A2=tok; Path=/" } });
      }
      if (String(url).includes("/api/allIndices")) {
        apiCalls += 1;
        if (apiCalls === 1) {
          return new Response("<!DOCTYPE html><html>Access Denied</html>", { status: 200 });
        }
        return jsonOk({ data: [{ index: "NIFTY 50" }] });
      }
      return new Response("no", { status: 404 });
    });
    const { nseJson } = await import("@/lib/feeds/india/nse-session");
    await expect(nseJson("/api/allIndices")).resolves.toEqual({ data: [{ index: "NIFTY 50" }] });
  });
});
