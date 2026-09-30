import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLiveCompanySentiment } from "../fetch-live";
import { classifyFinancialSentiment } from "@/lib/hf/finbert";
import { redditSubredditSearch } from "../reddit-http";

vi.mock("@/lib/hf/finbert", () => ({ classifyFinancialSentiment: vi.fn() }));
vi.mock("../google-news-reddit-fallback", () => ({
  fetchRedditHitsViaGoogleNews: vi.fn(async () => ({ hits: [], subredditById: new Map() })),
}));
vi.mock("../reddit-http", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../reddit-http")>();
  return {
    ...mod,
    sleep: vi.fn(async () => {}),
    isRedditOAuthConfigured: vi.fn(() => false),
    redditSubredditSearch: vi.fn(),
  };
});

const mockClassify = vi.mocked(classifyFinancialSentiment);
const mockSearch = vi.mocked(redditSubredditSearch);

function hit(id: string, title: string, permalink = `/r/test/comments/${id}/x`) {
  return {
    id,
    title,
    permalink,
    createdUtc: Math.floor(Date.now() / 1000),
    score: 1,
    numComments: 0,
  };
}

describe("fetchLiveCompanySentiment", () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  afterEach(() => {
    mockClassify.mockReset();
  });

  it("aggregates real posts returned by the (mocked) Reddit search API into honest totals", async () => {
    mockClassify.mockRejectedValue(new Error("HF unavailable in test"));
    mockSearch
      .mockResolvedValueOnce({
        ok: true,
        via: "public",
        hits: [
          hit("abc123", "Bullish on this — target price raised"),
          hit("def456", "Anyone tracking the quarterly results?"),
        ],
      })
      .mockResolvedValue({ ok: true, via: "public", hits: [] });

    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.symbol).toBe("RELIANCE");
    expect(result.noData).toBe(false);
    expect(result.fetchIssue).toBeNull();
    expect(result.totalMentions7D).toBe(2);
    expect(result.topPosts).toHaveLength(2);
    expect(result.positivePct).toBe(50);
    expect(result.sentimentSource).toBe("lexicon");
  });

  it("uses FinBERT for sentiment when the HF call succeeds, in preference to the lexicon fallback", async () => {
    mockSearch.mockResolvedValueOnce({
      ok: true,
      via: "public",
      hits: [hit("abc123", "Great quarter, raising guidance"), hit("def456", "Missed estimates, weak outlook")],
    });
    mockSearch.mockResolvedValue({ ok: true, via: "public", hits: [] });
    mockClassify.mockResolvedValue([
      { label: "positive", score: 0.9, scores: [] },
      { label: "negative", score: 0.8, scores: [] },
    ]);

    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.sentimentSource).toBe("finbert");
    expect(result.positivePct).toBe(50);
    expect(result.negativePct).toBe(50);
  });

  it("reports a verified noData when every subreddit succeeds with zero posts", async () => {
    mockSearch.mockResolvedValue({ ok: true, via: "public", hits: [] });
    const result = await fetchLiveCompanySentiment("SOMEOBSCURESTOCK");
    expect(result.noData).toBe(true);
    expect(result.fetchIssue).toBeNull();
    expect(result.totalMentions7D).toBe(0);
  });

  it("never throws when every subreddit request fails, and reports fetchIssue instead of a false noData", async () => {
    mockSearch.mockResolvedValue({ ok: false, reason: "network error" });
    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.noData).toBe(false);
    expect(result.fetchIssue).not.toBeNull();
    expect(result.totalMentions7D).toBe(0);
  });

  it("treats blocked responses as fetch failure, not verified noData", async () => {
    mockSearch.mockResolvedValue({ ok: false, reason: "HTTP 429 (JSON blocked; RSS fallback failed)" });
    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.noData).toBe(false);
    expect(result.fetchIssue).toMatch(/429|403|blocked/i);
  });

  it("drops stickied posts at parse time in reddit-http (integration via hits list)", async () => {
    mockSearch.mockResolvedValueOnce({
      ok: true,
      via: "public",
      hits: [hit("real1", "Bullish on this stock")],
    });
    mockSearch.mockResolvedValue({ ok: true, via: "public", hits: [] });
    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.totalMentions7D).toBe(1);
    expect(result.topPosts[0]!.id).toBe("real1");
  });
});
