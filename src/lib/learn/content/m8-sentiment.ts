import type { LearnModule } from "../types";

export const SENTIMENT: LearnModule = {
  slug: "sentiment-and-ai",
  title: "Sentiment, News & AI Research",
  tagline: "Crowd mood, search interest, AI debate and model signals",
  description:
    "How to read news sentiment, retail chatter and search trends, and how to use the AI Desk, AI Signals and the daily brief without over-trusting a model.",
  level: "Intermediate",
  navSection: "Stocks",
  accent: { text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-500" },
  chapters: [
    {
      slug: "daily-brief-and-news-sentiment",
      title: "The daily brief and news sentiment scoring",
      summary: "How to turn a flood of headlines into a two-minute read, and what a sentiment score means.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "News is scored for sentiment (positive, neutral, negative) and relevance to the stock, sector or market. A pre-market and post-close brief condenses the most relevant items with cited sources.",
          ],
        },
        {
          heading: "Reading it well",
          paragraphs: [],
          bullets: [
            "Check the source and the date.",
            "Distinguish a new fact from a recycled opinion.",
            "A negative headline on a tiny item is not a negative signal.",
            "Markets often move before the story is written.",
          ],
        },
      ],
      takeaways: [
        "Sentiment scores summarise tone, not truth.",
        "Source quality and freshness matter.",
        "Use the brief as a map; verify what matters.",
      ],
      tools: [
        { label: "Daily Brief", href: "/intelligence/brief", blurb: "Pre-market and post-close brief with cited sources." },
        { label: "Intelligence Feed", href: "/intelligence", blurb: "News scored for sentiment and relevance." },
      ],
      related: ["sentiment-and-ai/retail-sentiment-reddit"],
    },
    {
      slug: "retail-sentiment-reddit",
      title: "Retail sentiment and mention spikes",
      summary: "What crowd chatter tells you, and why extremes are often a contrarian signal.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Online communities such as Reddit show what retail investors are excited or worried about. A sudden spike in mentions of a stock often follows a price move rather than predicting it.",
          ],
        },
        {
          heading: "How to use it",
          paragraphs: [],
          bullets: [
            "Look for sustained, rising discussion, not one-day noise.",
            "Read the actual bull and bear theses, not just counts.",
            "Extreme euphoria near highs is a caution flag.",
            "Chatter on thin stocks can be manipulated.",
          ],
        },
      ],
      takeaways: [
        "Chatter is a mood gauge, not a forecast.",
        "Extremes tend to mark crowded trades.",
        "Cross-check with price, volume and fundamentals.",
      ],
      tools: [
        { label: "Retail Sentiment", href: "/intelligence/reddit", blurb: "Reddit chatter, mention spikes and bull/bear theses." },
        { label: "Search Trends", href: "/intelligence/search-trends", blurb: "Search interest in companies, IPOs and sectors." },
      ],
      related: ["sentiment-and-ai/search-trends-attention"],
    },
    {
      slug: "search-trends-attention",
      title: "Search trends as an attention gauge",
      summary: "How Google search interest reveals what the public is paying attention to.",
      minutes: 3,
      sections: [
        {
          paragraphs: [
            "Search interest is a proxy for public attention. A rising trend for an IPO name, a sector or a theme shows growing awareness, often late in a move.",
          ],
        },
        {
          heading: "Caveats",
          paragraphs: [
            "Attention is not direction: people search for a stock after both good and bad news. Combine with price and flow data before drawing a conclusion.",
          ],
        },
      ],
      takeaways: [
        "Search measures attention, not conviction.",
        "Peaks in attention often coincide with peaks in price moves.",
        "Best used to gauge crowding and IPO interest.",
      ],
      tools: [
        { label: "Search Trends", href: "/intelligence/search-trends", blurb: "Google search interest in companies, IPOs and sectors." },
        { label: "IPO Pipeline", href: "/research/ipo", blurb: "See the search buzz behind upcoming listings." },
      ],
      related: ["ipo-primary-market/what-is-ipo-gmp"],
    },
    {
      slug: "ai-desk-explained",
      title: "The AI Desk: a structured bull vs bear debate",
      summary: "How multi-agent analysis works, what it cites, and how to challenge it.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "The AI Desk runs several language-model analysts (fundamental, sentiment, technical, bull, bear, trader and risk) over price data, ratios and news fetched at run time. Each output shows its evidence date and where analysts disagree.",
          ],
        },
        {
          heading: "Use it as a research assistant",
          paragraphs: [],
          bullets: [
            "Read the disagreement, not just the verdict.",
            "Open the cited sources and verify key facts.",
            "Remember confidence figures are the model's own estimate, not a calibrated probability.",
            "Models can misread sources or miss recent events.",
          ],
        },
      ],
      takeaways: [
        "AI debate surfaces arguments you may have missed.",
        "Verify citations before acting.",
        "Output is research information, never a recommendation.",
      ],
      tools: [
        { label: "AI Desk", href: "/research/ai-desk", blurb: "AI analysts debate a stock, with sources and factor backtests." },
        { label: "Methodology: AI", href: "/methodology", blurb: "How the AI outputs are produced." },
      ],
      related: ["data-trust-and-ai/how-to-use-ai-responsibly"],
    },
    {
      slug: "ai-signals-explained",
      title: "AI Signals: a next-day model and its track record",
      summary: "What the model predicts, how it is scored and why the published record matters more than any single call.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "AI Signals estimates the probable direction for the next trading day using price-based features. What makes it credible is not a clever model, but a published, time-stamped track record you can check.",
          ],
        },
        {
          heading: "How to judge a signal model",
          paragraphs: [],
          bullets: [
            "Hit rate and payoff over many calls, not a few.",
            "Out-of-sample results, not just in-sample fits.",
            "Performance across market regimes.",
            "Transaction cost and slippage assumptions.",
          ],
        },
        {
          paragraphs: ["A 55% hit rate can be very valuable or worthless depending on payoff and costs."],
        },
      ],
      takeaways: [
        "Judge a model by its track record, not its story.",
        "Edge is small; costs can erase it.",
        "Signals are information, not instructions.",
      ],
      tools: [
        { label: "AI Signals", href: "/intelligence/ai-signals", blurb: "Next-day model with its published track record." },
        { label: "Backtesting", href: "/intelligence/backtesting", blurb: "Test ideas against history." },
      ],
      related: ["technical-analysis/backtesting-basics"],
    },
  ],
};
