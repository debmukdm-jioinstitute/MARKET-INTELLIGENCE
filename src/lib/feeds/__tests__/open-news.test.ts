import { describe, expect, it } from "vitest";
import {
  googleNewsMacroQueries,
  openCommunityNewsEnabled,
  redditSubreddits,
} from "@/lib/feeds/open-news-config";
import { scoreHeadlineLexicon } from "@/lib/feeds/sentiment-lexicon";
import { filterOpenCommunityNews } from "@/lib/feeds/news-sort";
import type { NewsItem } from "@/lib/feeds/types";

describe("open-news-config", () => {
  it("defaults reddit subs and google queries", () => {
    expect(redditSubreddits()).toContain("IndiaInvestments");
    expect(googleNewsMacroQueries().length).toBeGreaterThan(0);
    expect(openCommunityNewsEnabled()).toBe(true);
  });
});

describe("sentiment-lexicon", () => {
  it("scores bullish vs bearish headlines", () => {
    expect(scoreHeadlineLexicon("Nifty rally on strong upgrade").label).toBe("positive");
    expect(scoreHeadlineLexicon("Stock crash amid fraud probe").label).toBe("negative");
  });
});

describe("filterOpenCommunityNews", () => {
  it("keeps reddit and publisher rss", () => {
    const items: NewsItem[] = [
      { id: "1", source: "reddit", title: "t", link: "https://x" },
      { id: "2", source: "nse", title: "t", link: "https://y" },
      { id: "3", source: "livemint", title: "t", link: "https://z" },
    ];
    expect(filterOpenCommunityNews(items).map((i) => i.source)).toEqual(["reddit", "livemint"]);
  });
});

describe("feed-source-provenance", () => {
  it("covers every FeedSourceId", async () => {
    const { getFeedSourceProvenance } = await import("@/lib/feeds/feed-source-provenance");
    const ids: import("@/lib/feeds/types").FeedSourceId[] = [
      "nse",
      "bse",
      "rbi",
      "reddit",
      "googlenews",
      "fred",
    ];
    for (const id of ids) {
      expect(getFeedSourceProvenance(id).fetchMethod.length).toBeGreaterThan(5);
    }
  });
});
