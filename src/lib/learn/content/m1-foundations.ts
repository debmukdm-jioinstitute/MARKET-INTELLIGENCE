import type { LearnModule } from "../types";

export const FOUNDATIONS: LearnModule = {
  slug: "market-foundations",
  title: "Market Foundations",
  tagline: "How Indian markets work, from zero",
  description:
    "Exchanges, indices, trading hours, market cap, circuits and how to read a price chart. Start here if the market still feels like a black box.",
  level: "Beginner",
  navSection: "Today",
  accent: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  chapters: [
    {
      slug: "stock-market-basics",
      title: "How the stock market works",
      summary: "What a share is, why companies list, and how NSE and BSE match buyers with sellers.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "A share is a small slice of ownership in a company. Companies list on an exchange to raise money from the public; investors buy shares hoping the business grows and the price rises, and may also receive dividends.",
            "India has two main exchanges: the National Stock Exchange (NSE) and the BSE (formerly Bombay Stock Exchange). Both run electronic order books that match buy and sell orders by price and time. SEBI regulates exchanges, brokers and listed companies.",
          ],
        },
        {
          heading: "Primary vs secondary market",
          paragraphs: [
            "In the primary market, a company sells new shares directly, for example through an IPO. In the secondary market, investors trade existing shares among themselves on the exchange. Daily price moves you see on screens come from the secondary market.",
          ],
        },
        {
          heading: "What moves a price",
          paragraphs: ["Prices move because more people want to buy than sell, or the reverse. Common triggers:"],
          bullets: [
            "Company results, guidance and corporate actions",
            "Sector news, regulation and government policy",
            "Interest rates, currency and commodity moves",
            "Large institutional buying or selling",
            "General sentiment and global cues",
          ],
        },
      ],
      takeaways: [
        "A share is fractional ownership; price is set by supply and demand.",
        "NSE and BSE are the two exchanges; SEBI is the regulator.",
        "Primary market raises new money; secondary market trades existing shares.",
      ],
      tools: [
        { label: "Markets overview", href: "/markets", blurb: "Equities, rates and FX on one board." },
        { label: "India Markets", href: "/markets/india", blurb: "NSE / BSE headline pulse and index depth." },
      ],
      related: ["market-foundations/indices-sensex-nifty", "ipo-primary-market/what-is-an-ipo"],
    },
    {
      slug: "indices-sensex-nifty",
      title: "Indices: Sensex, Nifty and what they track",
      summary: "How a basket of stocks becomes one number, and which index measures what.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "An index tracks the combined performance of a basket of stocks, so you can read the market in one number. The Nifty 50 holds 50 large NSE companies; the Sensex holds 30 large BSE companies.",
            "Most Indian indices are float-adjusted market-cap weighted: bigger companies, counting only freely tradable shares, move the index more. That is why a handful of heavyweights can swing the headline number.",
          ],
        },
        {
          heading: "Broad, sectoral and thematic indices",
          paragraphs: ["Beyond the headline indices there are others you will meet on the site:"],
          bullets: [
            "Broad: Nifty 500, Midcap 150, Smallcap 250",
            "Sectoral: Bank Nifty, Nifty IT, Nifty Pharma and more",
            "Global: S&P 500, Nasdaq, Nikkei, FTSE and other benchmarks",
            "Volatility: India VIX, the market's fear gauge",
          ],
        },
        {
          heading: "Why indices matter",
          paragraphs: [
            "Indices are the yardstick for fund performance, the base for futures and options, and a quick read on market mood. Comparing a stock or your portfolio to its benchmark tells you whether you added value or just rode the market.",
          ],
        },
      ],
      takeaways: [
        "Index = weighted basket of stocks; Nifty 50 (NSE) and Sensex (BSE) are the headline pair.",
        "Large weights dominate: a few stocks can move the whole index.",
        "Use a benchmark to judge whether your returns are skill or just market beta.",
      ],
      tools: [
        { label: "India Markets", href: "/markets/india", blurb: "Index levels, constituents and depth." },
        { label: "World Indices", href: "/macro/indices", blurb: "Global benchmarks, ranges and 52-week tape." },
        { label: "Sector Map", href: "/markets/sectors", blurb: "Sector performance and comparables." },
      ],
      related: ["market-foundations/market-cap-large-mid-small", "fundamental-analysis/nifty-pe-ratio-explained"],
    },
    {
      slug: "trading-hours-and-market-states",
      title: "Trading hours, holidays and market states",
      summary: "When Indian markets are open, what pre-open does, and what Live, Delayed, Stale and Closed mean on the site.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "NSE and BSE cash markets trade Monday to Friday, 9:15 am to 3:30 pm IST, with a pre-open call auction from 9:00 to 9:15 that sets the opening price. Exchanges are shut on weekends and on declared holidays.",
          ],
        },
        {
          heading: "What the badges on the site mean",
          paragraphs: ["Every quote on Market Intelligence carries an as-of time and a state:"],
          bullets: [
            "Live: the provider states zero delay.",
            "Delayed: the provider states a delay, shown in minutes.",
            "Stale: the last value is older than the freshness limit; treat with caution.",
            "Closed: outside the session, so you see the last close and the next session.",
            "Unavailable: the feed failed; the page says so instead of guessing.",
          ],
        },
        {
          heading: "End-of-day data",
          paragraphs: [
            "The scanner, backtests and most macro series update after the close or on the source's release schedule. A reading from yesterday is not a live signal.",
          ],
        },
      ],
      takeaways: [
        "Cash market: 9:15 am to 3:30 pm IST, Monday to Friday.",
        "Always check the as-of time and state badge before acting on a number.",
        "Missing data is shown as unavailable, never silently estimated.",
      ],
      tools: [
        { label: "Methodology", href: "/methodology", blurb: "Freshness rules and market states in full." },
        { label: "Data Health", href: "/data/health", blurb: "Freshness and provenance of every series." },
      ],
      related: ["data-trust-and-ai/data-freshness-and-provenance"],
    },
    {
      slug: "market-cap-large-mid-small",
      legacySlug: "market-cap-large-mid-small",
      title: "Market cap: large, mid and small cap",
      summary: "Market capitalisation groups companies by total equity value and shapes risk, liquidity and coverage.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Market capitalisation is share price multiplied by shares outstanding. It is the market's price tag for the whole company, not its revenue or profit.",
            "SEBI and AMFI classify the 100 largest companies by market cap as large caps, ranks 101 to 250 as mid caps and the rest as small caps. NSE indices such as Nifty 50, Midcap 150 and Smallcap 250 use float-adjusted market cap ranks for membership.",
          ],
        },
        {
          heading: "Trade-offs",
          paragraphs: [],
          bullets: [
            "Large caps: more liquid, wider analyst coverage, usually smoother moves.",
            "Mid caps: faster growth potential with more cyclicality.",
            "Small caps: can move sharply either way, with liquidity and governance risk.",
          ],
        },
        {
          paragraphs: [
            "Market cap says nothing about whether a stock is cheap. Pair it with valuation ratios and quality metrics before drawing conclusions.",
          ],
        },
      ],
      takeaways: [
        "Market cap = price × shares outstanding.",
        "Bigger is not safer in every case, but it usually means better liquidity.",
        "Mix of caps in a portfolio changes both return potential and drawdown risk.",
      ],
      tools: [
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "Scan the Nifty 500 and filter by cap bucket." },
        { label: "Sector Map", href: "/markets/sectors", blurb: "Compare companies within a sector." },
      ],
      related: ["fundamental-analysis/valuation-ratios-pe-pb-ev", "portfolio-and-risk/diversification-basics"],
    },
    {
      slug: "what-is-a-circuit-limit",
      legacySlug: "what-is-a-circuit-limit",
      title: "Circuit limits and price bands",
      summary: "Why a stock suddenly stops moving, and what upper and lower circuits do.",
      minutes: 3,
      sections: [
        {
          paragraphs: [
            "Exchanges set a daily price band for each stock, commonly 2%, 5%, 10% or 20%. When the price touches the band, matching pauses. Hitting the top is an upper circuit; hitting the bottom is a lower circuit.",
            "Circuits follow news, results, rumours or index rebalances. Trading may resume the next session or in an auction. Index-wide circuit breakers (10%, 15%, 20% moves) halt the entire market.",
          ],
        },
        {
          heading: "How to read it",
          paragraphs: [
            "A stock stuck at upper circuit with huge pending buy orders shows strong demand; stuck at lower circuit shows panic. Either way, you may be unable to exit at the price you want, which is a liquidity risk to price in.",
          ],
        },
      ],
      takeaways: [
        "Circuits are a risk control by the exchange, not a verdict on the company.",
        "A locked stock can trap you: you may not be able to sell at lower circuit.",
        "Index circuit breakers pause all trading during extreme moves.",
      ],
      tools: [
        { label: "India Markets", href: "/markets/india", blurb: "Spot movers and market depth." },
        { label: "Breadth & Momentum", href: "/markets/breadth", blurb: "How wide a move is across stocks." },
      ],
      related: ["technical-analysis/volume-and-liquidity"],
    },
    {
      slug: "how-to-read-a-candlestick-chart",
      legacySlug: "how-to-read-a-candlestick-chart",
      title: "How to read a candlestick chart",
      summary: "Open, high, low and close in one shape: the basis of nearly every price chart.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Each candle covers one period, for example one day. The body spans the open to the close; thin wicks show the high and the low. Up candles (green or hollow) closed above the open; down candles closed below.",
          ],
        },
        {
          heading: "What a candle tells you",
          paragraphs: [],
          bullets: [
            "Long body: strong, one-sided pressure in the period.",
            "Long upper wick: buyers pushed up but sellers rejected the high.",
            "Long lower wick: sellers pushed down but buyers absorbed it.",
            "Tiny body (doji): indecision between buyers and sellers.",
          ],
        },
        {
          heading: "Context is everything",
          paragraphs: [
            "A single candle is not a buy or sell signal. Read it with the trend, volume and nearby support or resistance. The same hammer means different things at a 52-week low and in the middle of a range.",
          ],
        },
      ],
      takeaways: [
        "Body = open to close; wicks = high and low.",
        "Wicks show rejection; bodies show conviction.",
        "Use candles with trend and volume, never alone.",
      ],
      tools: [
        { label: "Stock research page", href: "/research/RELIANCE", blurb: "Price chart, fundamentals and consensus for any symbol." },
        { label: "Trade Lab", href: "/intelligence/trade-lab", blurb: "Chart any index or F&O stock with indicators and patterns." },
      ],
      related: ["technical-analysis/chart-patterns", "technical-analysis/support-resistance-trend"],
    },
  ],
};
