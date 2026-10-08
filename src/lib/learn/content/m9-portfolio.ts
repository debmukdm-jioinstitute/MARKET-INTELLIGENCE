import type { LearnModule } from "../types";

export const PORTFOLIO: LearnModule = {
  slug: "portfolio-and-risk",
  title: "Portfolio & Risk Management",
  tagline: "Build, measure and improve what you own",
  description:
    "Diversification, allocation, risk metrics like volatility and drawdown, attribution, factor tilts, optimisation, Indian capital-gains tax and tracking a watchlist.",
  level: "Intermediate",
  navSection: "Portfolio",
  accent: { text: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", dot: "bg-violet-500" },
  chapters: [
    {
      slug: "diversification-basics",
      legacySlug: "portfolio-diversification-basics",
      title: "Portfolio diversification for beginners",
      summary: "Spreading holdings across sectors and regions reduces reliance on one name. It does not remove market risk.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Diversification limits the damage when one company or sector falls. A simple start is a core of liquid large caps plus measured sector weights, then reviewing concentration when adding mid caps, small caps or US listings.",
            "Owning many stocks is not the same as being diversified: ten banks are one bet. Correlation matters more than count.",
          ],
        },
        {
          heading: "Check yourself",
          paragraphs: [],
          bullets: [
            "No single stock above a weight you can stomach losing half of.",
            "No single sector dominating the book.",
            "A mix of market caps and, if suitable, asset classes.",
            "Watch fund overlap if you hold multiple mutual funds.",
          ],
        },
      ],
      takeaways: [
        "Diversify across uncorrelated risks, not just across names.",
        "Concentration should be a deliberate choice.",
        "Re-check as positions drift.",
      ],
      tools: [
        { label: "Portfolio", href: "/portfolio", blurb: "Live positions, NAV and P&L (sign in to save)." },
        { label: "Allocation", href: "/portfolio/allocation", blurb: "Actual exposure versus your targets." },
      ],
      related: ["portfolio-and-risk/portfolio-risk-metrics", "ownership-and-risk/mutual-fund-holdings-and-overlap"],
    },
    {
      slug: "tracking-holdings-and-watchlist",
      title: "Tracking holdings, activity and your watchlist",
      summary: "Import holdings, log trades and keep a watchlist for names you want but do not yet own.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "A portfolio view shows each position, its cost, current value, day change and total P&L, plus NAV for the whole book. An activity log records every trade and corporate action so realised gains are traceable.",
          ],
        },
        {
          heading: "Watchlist",
          paragraphs: [
            "A watchlist tracks names without a position. Pair it with alerts so you are notified at the levels you decided on in advance.",
          ],
        },
        {
          heading: "Importing",
          paragraphs: [
            "You can add holdings manually or import a broker statement. Always verify quantities and average prices after import.",
          ],
        },
      ],
      takeaways: [
        "Accurate cost basis drives everything downstream.",
        "Log every trade; tax depends on it.",
        "Use a watchlist plus alerts instead of impulse buying.",
      ],
      tools: [
        { label: "Portfolio overview", href: "/portfolio", blurb: "Live positions, NAV and P&L." },
        { label: "Watchlist", href: "/portfolio/watchlist", blurb: "Names you are tracking without a position." },
        { label: "Activity", href: "/portfolio/activity", blurb: "Every trade and corporate action in one log." },
      ],
      related: ["technical-analysis/alerts-guide"],
    },
    {
      slug: "portfolio-risk-metrics",
      title: "Risk metrics: volatility, drawdown, VaR, beta and Sharpe",
      summary: "What each number measures, in plain language, and how to read them for your own book.",
      minutes: 7,
      sections: [
        {
          heading: "The metrics",
          paragraphs: [],
          bullets: [
            "Volatility: how much returns swing; the annualised standard deviation.",
            "Maximum drawdown: the biggest fall from a peak to a trough.",
            "Value at Risk (VaR): an estimate of the loss not expected to be exceeded on a typical day at a stated confidence level.",
            "Beta: sensitivity to the market; 1.2 means about 20% more movement than the benchmark.",
            "Sharpe ratio: return above the risk-free rate per unit of volatility.",
          ],
        },
        {
          heading: "Using them",
          paragraphs: [
            "Drawdown is the number that tests your nerve: ask whether you would hold through a fall of that size. VaR describes normal days and can understate extreme ones. Every metric depends on its lookback window and data.",
          ],
        },
      ],
      takeaways: [
        "Look at drawdown first; it is the emotional risk.",
        "VaR and volatility understate tail events.",
        "Sharpe compares risk-adjusted return across portfolios.",
      ],
      tools: [
        { label: "Portfolio Risk", href: "/portfolio/risk", blurb: "Volatility, drawdowns and worst-case estimates." },
        { label: "Stress Index", href: "/macro/stress", blurb: "Market-wide stress to pair with your own risk." },
      ],
      related: ["portfolio-and-risk/attribution-and-factors"],
    },
    {
      slug: "attribution-and-factors",
      title: "Attribution and factor exposure",
      summary: "Find out why you made or lost money: sector bets, stock picks or style tilts.",
      minutes: 5,
      sections: [
        {
          heading: "Attribution",
          paragraphs: [
            "Attribution splits portfolio return versus a benchmark into allocation (being in the right sectors) and selection (picking the right stocks within them). It tells you whether skill, or just a sector tailwind, drove returns.",
          ],
        },
        {
          heading: "Factor exposure",
          paragraphs: [
            "Factors are persistent drivers of returns: value, momentum, quality, size and low volatility. Your holdings may lean on one without you realising, such as a high-momentum, small-cap tilt.",
          ],
        },
        {
          paragraphs: ["Knowing the tilt lets you decide whether it is intentional and whether it matches your risk tolerance."],
        },
      ],
      takeaways: [
        "Separate sector luck from stock-picking skill.",
        "Factor tilts explain behaviour in different regimes.",
        "Hidden tilts are hidden risks.",
      ],
      tools: [
        { label: "Attribution", href: "/portfolio/attribution", blurb: "What drove your returns: sectors or stock picks." },
        { label: "Factor Exposure", href: "/portfolio/quant", blurb: "Value, momentum and size tilts in your portfolio." },
      ],
      related: ["portfolio-and-risk/rebalancing-and-optimizer"],
    },
    {
      slug: "rebalancing-and-optimizer",
      title: "Rebalancing and the portfolio optimizer",
      summary: "Bring a drifting portfolio back to target, and what an optimizer can and cannot do.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Over time winners grow and the mix drifts from your plan. Rebalancing sells some of what has grown and buys what has lagged to restore target weights, which controls risk and enforces discipline.",
          ],
        },
        {
          heading: "Optimizers",
          paragraphs: [
            "An optimizer suggests weights that maximise expected return for a risk level, using historical returns and correlations. Its inputs are estimates, so results are sensitive to the data window. Treat output as a starting point and check turnover, tax and liquidity.",
          ],
        },
      ],
      takeaways: [
        "Rebalance on a rule (time or threshold), not on emotion.",
        "Optimizer output depends heavily on its inputs.",
        "Account for tax and costs before trading.",
      ],
      tools: [
        { label: "Optimizer", href: "/portfolio/optimizer", blurb: "Rebalance suggestions for your risk level." },
        { label: "Allocation", href: "/portfolio/allocation", blurb: "See drift against targets." },
      ],
      related: ["portfolio-and-risk/capital-gains-tax-india"],
    },
    {
      slug: "capital-gains-tax-india",
      title: "Capital gains tax on Indian equities",
      summary: "STCG, LTCG, holding periods and how realised gains are estimated from your trades.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "For listed equity, gains on shares held up to 12 months are short-term (STCG) and gains on shares held longer are long-term (LTCG). Rates, exemptions and rules change with the Union Budget, so check the current rules.",
          ],
        },
        {
          heading: "What affects your tax",
          paragraphs: [],
          bullets: [
            "Holding period of each lot (first-in, first-out matching).",
            "Grandfathering for older purchases, where applicable.",
            "Setting off losses against gains.",
            "Securities transaction tax and other charges.",
          ],
        },
        {
          paragraphs: [
            "The site's tax view is an illustrative estimate from your logged trades. Confirm with a qualified tax adviser before filing.",
          ],
        },
      ],
      takeaways: [
        "Holding period decides short or long term.",
        "Accurate trade logs make estimates reliable.",
        "Estimates are not tax advice; rules change.",
      ],
      tools: [
        { label: "Tax", href: "/portfolio/tax", blurb: "Capital-gains view of your holdings." },
        { label: "Activity", href: "/portfolio/activity", blurb: "Trade log that feeds the estimate." },
      ],
      related: ["portfolio-and-risk/tracking-holdings-and-watchlist"],
    },
  ],
};
