import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));

vi.mock("@/lib/feeds/http", () => ({
  feedFetch: feedFetchMock,
}));

describe("fetchYahooMarketCapMap", () => {
  beforeEach(() => {
    vi.resetModules();
    feedFetchMock.mockReset();
  });

  it("fills Indian caps from quoteSummary when v7 omits marketCap", async () => {
    feedFetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/v7/finance/quote")) {
        if (!url.includes("crumb=")) return new Response("{}", { status: 401 });
        return new Response(
          JSON.stringify({
            quoteResponse: {
              result: [{ symbol: "RELIANCE.NS", regularMarketPrice: 1542.1, marketCap: null }],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("fc.yahoo.com")) {
        return new Response("", { status: 404, headers: { "set-cookie": "A3=tok; Path=/" } });
      }
      if (url.includes("/v1/test/getcrumb")) return new Response("c1", { status: 200 });
      if (url.includes("/v10/finance/quoteSummary/RELIANCE.NS")) {
        return new Response(
          JSON.stringify({
            quoteSummary: {
              result: [
                {
                  price: { regularMarketPrice: { raw: 1542.1 }, marketCap: {} },
                  defaultKeyStatistics: { floatShares: { raw: 6_000_000_000 } },
                },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("{}", { status: 404 });
    });
    const { fetchYahooMarketCapMap } = await import("@/lib/feeds/sources/yahoo");
    const caps = await fetchYahooMarketCapMap(["RELIANCE.NS"]);
    expect(caps.get("RELIANCE.NS")).toBeCloseTo(1542.1 * 6_000_000_000, 0);
  });
});
