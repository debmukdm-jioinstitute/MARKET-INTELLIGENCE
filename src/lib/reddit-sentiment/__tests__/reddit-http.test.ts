import { describe, expect, it, vi, afterEach } from "vitest";
import { redditSubredditSearch } from "../reddit-http";

function okJson(body: unknown): Response {
  return {
    ok: true,
    headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/json; charset=UTF-8" : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function blockedJson(): Response {
  return { ok: false, status: 403, headers: { get: () => "text/html" }, json: async () => ({}), text: async () => "" } as unknown as Response;
}

const atomWithEntry = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>RELIANCE earnings thread</title><link href="https://www.reddit.com/r/IndiaInvestments/comments/abc123/title/" /><updated>2026-09-28T10:00:00+00:00</updated></entry>
</feed>`;

describe("redditSubredditSearch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses RSS when JSON is blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes(".json")) return blockedJson();
        if (String(url).includes(".rss")) {
          return { ok: true, headers: { get: () => "application/atom+xml" }, text: async () => atomWithEntry } as unknown as Response;
        }
        return blockedJson();
      }),
    );

    const result = await redditSubredditSearch("IndiaInvestments", "RELIANCE", 10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.via).toBe("rss");
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]!.id).toBe("abc123");
    }
  });

  it("uses public JSON when RSS fails and JSON succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes(".rss")) return blockedJson();
        return okJson({
          data: {
            children: [
              {
                data: {
                  id: "x1",
                  title: "Bullish RELIANCE",
                  permalink: "/r/IndiaInvestments/comments/x1/y",
                  created_utc: 1_700_000_000,
                  score: 3,
                  num_comments: 1,
                },
              },
            ],
          },
        });
      }),
    );

    const result = await redditSubredditSearch("IndiaInvestments", "RELIANCE", 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.via).toBe("public");
      expect(result.hits[0]!.title).toContain("RELIANCE");
    }
  });
});
