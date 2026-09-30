import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));
const { yahooQuotesMock, upstoxQuotesMock, stooqQuotesMock, massiveQuotesMock } = vi.hoisted(
  () => ({
    yahooQuotesMock: vi.fn(),
    upstoxQuotesMock: vi.fn(),
    stooqQuotesMock: vi.fn(),
    massiveQuotesMock: vi.fn(),
  }),
);
const { dbRows } = vi.hoisted(() => ({ dbRows: [] as unknown[] }));

vi.mock("@/lib/feeds/http", () => ({
  feedFetch: feedFetchMock,
  timed: async (fn: () => Promise<unknown>) => {
    const start = Date.now();
    try {
      return { value: await fn(), latencyMs: Date.now() - start };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "err", latencyMs: Date.now() - start };
    }
  },
}));

vi.mock("@/lib/feeds/sources/yahoo", () => ({
  fetchYahooQuotes: yahooQuotesMock,
}));
vi.mock("@/lib/feeds/sources/upstox/quotes", () => ({
  INDIA_INSTRUMENT_KEYS: { "^NSEI": "NSE_IND|Nifty 50" },
  fetchUpstoxQuotes: upstoxQuotesMock,
}));
vi.mock("@/lib/feeds/sources/stooq", () => ({
  fetchStooqQuotes: stooqQuotesMock,
}));
vi.mock("@/lib/feeds/sources/massive", () => ({
  fetchMassiveUsQuotes: massiveQuotesMock,
  hasMassiveApiKey: () => false,
}));
vi.mock("@/lib/db", () => ({
  hasDatabase: () => true,
  ensureSchema: async () => {},
  sql: () => async () => dbRows,
}));
vi.mock("@/lib/feeds/india/instruments", () => ({
  INDIA_EQUITIES: [],
}));

function v7Response(rows: Record<string, unknown>[]) {
  return new Response(
    JSON.stringify({ quoteResponse: { result: rows, error: null } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function v8ChartResponse(price: number) {
  return new Response(
    JSON.stringify({
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: price,
              regularMarketChangePercent: 1,
              regularMarketPreviousClose: price - 1,
              currency: "USD",
              shortName: "Test",
            },
          },
        ],
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const liveQuote = (symbol: string, provider: "yahoo" | "upstox" = "yahoo") => ({
  symbol,
  price: 100,
  change: 1,
  changePct: 0.01,
  asOf: new Date().toISOString(),
  provider,
});

describe("yahoo v7 batch", () => {
  beforeEach(() => {
    vi.resetModules();
    feedFetchMock.mockReset();
  });

  it("fetches N symbols in ONE v7 request", async () => {
    feedFetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/v7/finance/quote")) {
        const syms = new URL(url).searchParams.get("symbols")!.split(",");
        return v7Response(
          syms.map((s) => ({ symbol: s, regularMarketPrice: 100, currency: "USD" })),
        );
      }
      return new Response("{}", { status: 404 });
    });
    const { fetchYahooQuotes } = await vi.importActual<typeof import("@/lib/feeds/sources/yahoo")>("@/lib/feeds/sources/yahoo");
    const quotes = await fetchYahooQuotes(["AAPL", "MSFT", "GOOG"]);
    expect(quotes).toHaveLength(3);
    expect(feedFetchMock).toHaveBeenCalledTimes(1);
    expect(feedFetchMock.mock.calls[0]![0]).toContain("/v7/finance/quote");
  });

  it("falls back to per-symbol v8 when v7 is blocked (401)", async () => {
    feedFetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/v7/finance/quote")) return new Response("{}", { status: 401 });
      if (url.includes("/v8/finance/chart/")) return v8ChartResponse(150);
      return new Response("{}", { status: 404 });
    });
    const { fetchYahooQuotes } = await vi.importActual<typeof import("@/lib/feeds/sources/yahoo")>("@/lib/feeds/sources/yahoo");
    const quotes = await fetchYahooQuotes(["AAPL"]);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]!.price).toBe(150);
    // 1 v7 attempt + 1 v8 fallback
    expect(feedFetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries Indian symbols with .NS suffix in v7", async () => {
    feedFetchMock.mockImplementation(async (url: string) => {
      const syms = new URL(url).searchParams.get("symbols")!.split(",");
      const rows = syms
        .filter((s) => s.endsWith(".NS"))
        .map((s) => ({ symbol: s, regularMarketPrice: 2500, currency: "INR" }));
      return v7Response(rows);
    });
    const { fetchYahooQuotes } = await vi.importActual<typeof import("@/lib/feeds/sources/yahoo")>("@/lib/feeds/sources/yahoo");
    const quotes = await fetchYahooQuotes(["RELIANCE"]);
    expect(quotes).toHaveLength(1);
    // requested symbol preserved even though Yahoo needed the .NS suffix
    expect(quotes[0]!.symbol).toBe("RELIANCE");
    expect(feedFetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("unified quote service", () => {
  beforeEach(async () => {
    vi.resetModules();
    yahooQuotesMock.mockReset().mockResolvedValue([]);
    upstoxQuotesMock.mockReset().mockResolvedValue([]);
    stooqQuotesMock.mockReset().mockResolvedValue([]);
    massiveQuotesMock.mockReset().mockResolvedValue([]);
    dbRows.length = 0;
    const { __resetQuoteServiceForTests } = await import("@/lib/feeds/quotes");
    __resetQuoteServiceForTests();
  });

  it("merges with official-first priority (upstox overrides yahoo)", async () => {
    yahooQuotesMock.mockResolvedValue([liveQuote("^NSEI", "yahoo")]);
    upstoxQuotesMock.mockResolvedValue([{ ...liveQuote("^NSEI", "upstox"), price: 999 }]);
    const { getQuotes } = await import("@/lib/feeds/quotes");
    const { quotes } = await getQuotes(["^NSEI", "AAPL"]);
    const nifty = quotes.find((q) => q.quote.symbol === "^NSEI")!;
    expect(nifty.quote.provider).toBe("upstox");
    expect(nifty.quote.price).toBe(999);
    expect(nifty.stale).toBe(false);
    // upstox got only the symbol it has a key for; yahoo got everything
    expect(upstoxQuotesMock).toHaveBeenCalledTimes(1);
    expect(yahooQuotesMock).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent requests for the same symbols (singleflight)", async () => {
    yahooQuotesMock.mockImplementation(
      async () => new Promise((r) => setTimeout(() => r([liveQuote("AAPL")]), 20)),
    );
    const { getQuotes } = await import("@/lib/feeds/quotes");
    const [a, b] = await Promise.all([getQuotes(["AAPL"]), getQuotes(["AAPL"])]);
    expect(a.quotes).toHaveLength(1);
    expect(b.quotes).toHaveLength(1);
    expect(yahooQuotesMock).toHaveBeenCalledTimes(1);
  });

  it("serves the second identical request from cache without refetching", async () => {
    yahooQuotesMock.mockResolvedValue([liveQuote("AAPL")]);
    const { getQuotes } = await import("@/lib/feeds/quotes");
    await getQuotes(["AAPL"]);
    await getQuotes(["AAPL"]);
    expect(yahooQuotesMock).toHaveBeenCalledTimes(1);
  });

  it("serves persisted last-good with stale=true when all live sources fail", async () => {
    dbRows.push({
      symbol: "AAPL",
      price: 250,
      change: 2,
      change_pct: 0.008,
      currency: "USD",
      provider: "yahoo",
      captured_at: new Date("2026-09-29T10:00:00Z"),
    });
    const { getQuotes } = await import("@/lib/feeds/quotes");
    const { quotes, sources } = await getQuotes(["AAPL"]);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]!.stale).toBe(true);
    expect(quotes[0]!.quote.price).toBe(250);
    expect(quotes[0]!.quote.asOf).toBe("2026-09-29T10:00:00.000Z");
    expect(sources.find((s) => s.id === "last-good")!.count).toBe(1);
  });

  it("returns empty (not invented) when live fails and no last-good exists", async () => {
    const { getQuotes } = await import("@/lib/feeds/quotes");
    const { quotes } = await getQuotes(["NOPE"]);
    expect(quotes).toHaveLength(0);
  });
});
