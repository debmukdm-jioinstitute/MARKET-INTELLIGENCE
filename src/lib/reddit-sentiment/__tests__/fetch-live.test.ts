import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLiveCompanySentiment } from "../fetch-live";

function redditListing(posts: { id: string; title: string; permalink: string; created_utc: number; score?: number; num_comments?: number; stickied?: boolean }[]) {
  return { data: { children: posts.map((p) => ({ data: p })) } };
}

/** A well-formed successful Reddit JSON response, matching real headers (content-type: application/json) — a bare `{ok:true, json}` object without headers is not a realistic Response and hid the exact bug this fetcher was built to catch (see fetch-live.ts's content-type check). */
function okJson(body: unknown): Response {
  return { ok: true, headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/json; charset=UTF-8" : null) }, json: async () => body } as unknown as Response;
}

/** What Reddit actually sends back when it blocks/rate-limits an unrecognized client: HTTP 403 with an HTML body, not JSON. */
function blockedHtml(): Response {
  return { ok: false, status: 403, headers: { get: () => "text/html" }, json: async () => ({}) } as unknown as Response;
}

describe("fetchLiveCompanySentiment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates real posts returned by the (mocked) Reddit search API into honest totals", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        // First subreddit search returns two real-shaped posts; every other subreddit returns none —
        // this is exactly the "some communities have activity, most don't" shape real data has.
        if (call === 1) {
          return okJson(
            redditListing([
              { id: "abc123", title: "Bullish on this — target price raised", permalink: "/r/test/comments/abc123/x", created_utc: Date.now() / 1000, score: 42, num_comments: 10 },
              { id: "def456", title: "Anyone tracking the quarterly results?", permalink: "/r/test/comments/def456/y", created_utc: Date.now() / 1000, score: 5, num_comments: 2 },
            ]),
          );
        }
        return okJson(redditListing([]));
      }),
    );

    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.symbol).toBe("RELIANCE");
    expect(result.noData).toBe(false);
    expect(result.fetchIssue).toBeNull();
    expect(result.totalMentions7D).toBe(2);
    expect(result.topPosts).toHaveLength(2);
    expect(result.topPosts[0]!.url).toContain("reddit.com/r/test/comments/");
    // One bullish-worded title, one neutral -> real, checkable percentages, not hash-seeded noise.
    expect(result.positivePct).toBe(50);
    expect(result.communityDistribution.reduce((a, c) => a + c.postCount, 0)).toBe(2);
  });

  it("reports a verified noData (not fabricated activity) when every subreddit request succeeds and genuinely returns nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(redditListing([]))));
    const result = await fetchLiveCompanySentiment("SOMEOBSCURESTOCK");
    expect(result.noData).toBe(true);
    expect(result.fetchIssue).toBeNull();
    expect(result.totalMentions7D).toBe(0);
    expect(result.topPosts).toHaveLength(0);
  });

  it("never throws when every subreddit request fails, and reports fetchIssue instead of a false noData", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network error");
      }),
    );
    const result = await fetchLiveCompanySentiment("RELIANCE");
    // The critical distinction this fetcher exists to make: a total fetch failure must NEVER look
    // like a verified "no discussion" — that would silently misreport a Reddit outage/block as a
    // real finding about the company.
    expect(result.noData).toBe(false);
    expect(result.fetchIssue).not.toBeNull();
    expect(result.totalMentions7D).toBe(0);
  });

  it("treats a blocked/rate-limited response (HTTP 403, HTML body) the same as a network failure — never a false noData", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => blockedHtml()));
    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.noData).toBe(false);
    expect(result.fetchIssue).toContain("HTTP 403");
    expect(result.totalMentions7D).toBe(0);
  });

  it("treats a 200 response with a non-JSON body (Reddit's HTML app shell) the same way, not a silent zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, headers: { get: () => "text/html; charset=UTF-8" }, json: async () => ({}) }) as unknown as Response),
    );
    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.noData).toBe(false);
    expect(result.fetchIssue).toContain("non-JSON");
  });

  it("drops stickied posts (mod announcements, not real discussion of the company)", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        if (call === 1) {
          return okJson({
            data: {
              children: [
                { data: { id: "sticky1", title: "Weekly discussion thread", permalink: "/r/test/comments/sticky1/x", created_utc: Date.now() / 1000, score: 1, stickied: true } },
                { data: { id: "real1", title: "Bullish on this stock", permalink: "/r/test/comments/real1/y", created_utc: Date.now() / 1000, score: 3, stickied: false } },
              ],
            },
          });
        }
        return okJson(redditListing([]));
      }),
    );
    const result = await fetchLiveCompanySentiment("RELIANCE");
    expect(result.totalMentions7D).toBe(1);
    expect(result.topPosts[0]!.id).toBe("real1");
  });
});
