import { describe, expect, it } from "vitest";
import { subredditSearchUrl, subredditSymbolDiscussionUrl } from "@/lib/reddit-sentiment/reddit-links";

describe("reddit discussion links", () => {
  it("builds in-subreddit search for a ticker", () => {
    const url = subredditSymbolDiscussionUrl("r/IndianStreetBets", "TMCV", {
      companyName: "Tata Motors Commercial Vehicles",
    });
    expect(url).toContain("/r/IndianStreetBets/search/");
    expect(url).toContain("restrict_sr=on");
    expect(url).toContain("TMCV");
  });

  it("includes debate topic terms when provided", () => {
    const url = subredditSymbolDiscussionUrl("r/IndiaInvestments", "RELIANCE", {
      topic: "Jio ARPU expansion",
    });
    expect(url).toContain("RELIANCE");
    expect(url).toMatch(/Jio|ARPU|expansion/);
  });

  it("searches community queries by title", () => {
    const url = subredditSearchUrl("r/personalfinanceindia", "how to calculate STCG on multiple brokers");
    expect(url).toContain("personalfinanceindia");
    expect(url).toContain("STCG");
  });
});
