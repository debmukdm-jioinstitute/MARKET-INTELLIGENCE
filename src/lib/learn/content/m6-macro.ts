import type { LearnModule } from "../types";

export const MACRO: LearnModule = {
  slug: "macro-and-economy",
  title: "Macro & Economy",
  tagline: "Growth, inflation, RBI, yields, currency and global risk",
  description:
    "How the economy moves markets: GDP and inflation, RBI policy and liquidity, bond yields, the rupee, commodities, stress, scenarios and the global backdrop.",
  level: "Intermediate",
  navSection: "Macro & Flows",
  accent: { text: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200", dot: "bg-cyan-500" },
  chapters: [
    {
      slug: "growth-inflation-and-regimes",
      title: "Growth, inflation and market regimes",
      summary: "The two numbers behind most macro stories, and how their combination sets the regime.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "GDP growth measures how fast the economy produces; inflation (CPI, WPI) measures how fast prices rise. Together they set the policy mood: high growth with low inflation is supportive; slow growth with high inflation (stagflation) is the hardest.",
          ],
        },
        {
          heading: "Key Indian releases",
          paragraphs: [],
          bullets: [
            "CPI inflation (MOSPI), the RBI's target variable.",
            "IIP and PMI: factory and services momentum.",
            "GDP: quarterly output growth.",
            "GST collections and trade data: demand and external balance.",
          ],
        },
        {
          heading: "Regimes",
          paragraphs: [
            "A regime-first read asks: is growth accelerating, is inflation rising, is liquidity easing? The answer tilts which asset classes and sectors tend to do better.",
          ],
        },
      ],
      takeaways: [
        "Growth and inflation together define the regime.",
        "Surprises versus expectations move markets, not the level alone.",
        "Use regime as a backdrop, not a trade trigger.",
      ],
      tools: [
        { label: "Global Board", href: "/macro", blurb: "Regime-first read on growth, inflation and liquidity." },
        { label: "India Macro", href: "/macro/india", blurb: "MOSPI, RBI and fiscal data on one page." },
        { label: "Economic Calendar", href: "/macro/calendar", blurb: "Upcoming data releases." },
      ],
      related: ["macro-and-economy/rbi-repo-and-liquidity"],
    },
    {
      slug: "rbi-repo-and-liquidity",
      title: "RBI, repo rate and system liquidity",
      summary: "How the central bank steers rates, and why liquidity matters as much as the headline rate.",
      minutes: 6,
      sections: [
        {
          paragraphs: [
            "The Reserve Bank of India's Monetary Policy Committee sets the repo rate, the rate at which banks borrow from the RBI. Cuts make credit cheaper and generally support equities and rate-sensitive sectors; hikes tighten conditions.",
          ],
        },
        {
          heading: "Stance and tools",
          paragraphs: [],
          bullets: [
            "Stance: accommodative, neutral or withdrawal of accommodation.",
            "CRR and SLR: reserves banks must hold.",
            "Open market operations and variable rate repo/reverse repo: manage liquidity day to day.",
          ],
        },
        {
          heading: "Liquidity",
          paragraphs: [
            "Surplus liquidity pushes short rates toward the lower band; deficit pushes them up. Transmission of a repo cut depends on liquidity being comfortable.",
          ],
        },
      ],
      takeaways: [
        "Repo rate sets the cost of money; liquidity decides how it transmits.",
        "Stance guidance often matters more than the move itself.",
        "Watch bond yields for the market's verdict on policy.",
      ],
      tools: [
        { label: "RBI & Liquidity", href: "/macro/rbi", blurb: "Policy stance, repo path and system liquidity." },
        { label: "Yields", href: "/macro/yields", blurb: "Bond yields across tenors." },
      ],
      related: ["macro-and-economy/bond-yields-explained"],
    },
    {
      slug: "bond-yields-explained",
      title: "Bond yields and the yield curve",
      summary: "Why the 10-year G-Sec is a market benchmark, and what a flat or inverted curve signals.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "A bond's yield moves opposite to its price. The 10-year government security (G-Sec) yield is India's benchmark risk-free rate: it anchors loan rates and the discount rate for equity valuation.",
          ],
        },
        {
          heading: "The curve",
          paragraphs: [
            "Plotting yields across maturities gives the yield curve. Normally it slopes up. A flat or inverted curve (short yields at or above long) has historically signalled slowing growth or tight policy.",
          ],
        },
        {
          heading: "Why equity investors care",
          paragraphs: [
            "Rising yields raise the hurdle for equities and hurt long-duration, high-valuation stocks first. Foreign flows also respond to the gap between Indian and US yields.",
          ],
        },
      ],
      takeaways: [
        "Yield up means price down.",
        "The 10-year G-Sec is the benchmark for valuation comparison.",
        "Curve shape signals the growth and policy outlook.",
      ],
      tools: [
        { label: "Yields", href: "/macro/yields", blurb: "Bond yields across tenors and countries." },
        { label: "Valuation", href: "/markets/sectors?tab=valuation", blurb: "Index multiples against the 10-year G-Sec." },
      ],
      related: ["fundamental-analysis/nifty-pe-ratio-explained"],
    },
    {
      slug: "currency-and-commodities",
      title: "The rupee, the dollar and commodities",
      summary: "USDINR, DXY, crude and gold: how external prices reach Indian markets.",
      minutes: 6,
      sections: [
        {
          heading: "The rupee",
          paragraphs: [
            "A weaker rupee helps exporters like IT and pharma and hurts importers and oil marketers. The dollar index (DXY) measures the dollar against major currencies; a strong dollar tends to pressure emerging-market assets and flows.",
          ],
        },
        {
          heading: "Crude oil",
          paragraphs: [
            "India imports most of its oil. Higher crude widens the current account deficit, pushes up inflation and weighs on the rupee, a triple effect that lands on equities, bonds and currency together.",
          ],
        },
        {
          heading: "Gold and metals",
          paragraphs: [
            "Gold is a hedge against uncertainty and a large import. Industrial metals such as copper track global growth and are used as a cycle gauge.",
          ],
        },
      ],
      takeaways: [
        "Oil, dollar and INR are linked; watch them as a set.",
        "Winners and losers differ by sector.",
        "Commodities double as growth and risk-sentiment gauges.",
      ],
      tools: [
        { label: "Currency", href: "/macro/currency", blurb: "DXY, USDINR and cross-currency tape." },
        { label: "Commodities", href: "/macro/commodities", blurb: "Crude, gold and industrial metals." },
        { label: "How Shocks Spread", href: "/macro/transmission", blurb: "Which sectors move when oil or INR jump." },
      ],
      related: ["macro-and-economy/shock-transmission-and-scenarios"],
    },
    {
      slug: "stress-index-and-warning-signs",
      title: "Macro stress index and early-warning signs",
      summary: "How several stress indicators are combined into one score, and how to read the warning clusters.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "A stress index combines indicators such as volatility, currency pressure, yield spreads and credit conditions into one score. Rising stress means more indicators are flashing at once, which historically goes with tighter financial conditions.",
          ],
        },
        {
          heading: "How to use it",
          paragraphs: [],
          bullets: [
            "Look at which cluster is driving the move (currency, rates, volatility).",
            "A high score is a reason to size risk down, not a timing call.",
            "Compare current stress with past episodes in the backtest.",
          ],
        },
      ],
      takeaways: [
        "Stress is about breadth of warnings, not a single indicator.",
        "Use it for risk management and context.",
        "Check how past stress episodes played out.",
      ],
      tools: [
        { label: "Stress Index", href: "/macro/stress", blurb: "India macro stress score and warning clusters." },
        { label: "Stress Backtest", href: "/macro/stress/backtest", blurb: "How stress readings behaved historically." },
      ],
      related: ["macro-and-economy/shock-transmission-and-scenarios"],
    },
    {
      slug: "shock-transmission-and-scenarios",
      title: "Shock transmission and scenario analysis",
      summary: "What happens to sectors and your portfolio if oil, the rupee or US yields move.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Transmission betas estimate how sensitive a sector or stock has historically been to a macro driver. A sector with a high oil beta tends to fall when crude spikes.",
          ],
        },
        {
          heading: "Scenarios",
          paragraphs: [
            "A scenario applies a hypothetical shock, such as crude +20% or INR −5%, and estimates the impact using those sensitivities. It is a what-if for risk awareness, not a forecast.",
          ],
        },
        {
          paragraphs: ["Use scenarios to find which holdings are most exposed and whether that exposure is intended."],
        },
      ],
      takeaways: [
        "Betas are historical estimates and can shift.",
        "Scenarios illustrate exposure, not probability.",
        "Run them to find concentrations you did not intend.",
      ],
      tools: [
        { label: "How Shocks Spread", href: "/macro/transmission", blurb: "Which sectors move when oil, INR or US yields jump." },
        { label: "Scenarios", href: "/macro/scenarios", blurb: "Shock oil, INR or yields; see the impact." },
        { label: "Portfolio Risk", href: "/portfolio/risk", blurb: "Apply risk views to your own holdings." },
      ],
      related: ["portfolio-and-risk/portfolio-risk-metrics"],
    },
    {
      slug: "global-markets-and-world-monitor",
      title: "Global markets, country risk and the world monitor",
      summary: "Why US data, China and geopolitics move Indian markets before the open.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Indian markets open in the shadow of the US close, Asian trading and overnight news. US yields, Fed decisions, the dollar and global risk appetite shape foreign flows into India.",
          ],
        },
        {
          heading: "What to scan each morning",
          paragraphs: [],
          bullets: [
            "US and Asian index moves and GIFT Nifty direction.",
            "Crude, gold, dollar index and US 10-year yield.",
            "Geopolitical and country-risk headlines.",
            "Scheduled global data releases.",
          ],
        },
        {
          heading: "Cross-country data",
          paragraphs: [
            "Global macro series and World Bank indicators for India and the US let you compare growth, inflation and fiscal health across economies.",
          ],
        },
      ],
      takeaways: [
        "Global cues set the tone for the Indian open.",
        "Track the dollar, US yields and crude as a basket.",
        "Compare economies with consistent, sourced series.",
      ],
      tools: [
        { label: "World Monitor", href: "/intelligence/world-monitor", blurb: "Global news, country risk and finance radar." },
        { label: "Global Data", href: "/macro/global", blurb: "Cross-country macro series." },
        { label: "World Indices", href: "/macro/indices", blurb: "Global benchmarks and 52-week tape." },
        { label: "World Bank Data", href: "/data/data360", blurb: "World Bank macro series for India and the US." },
      ],
      related: ["macro-and-economy/currency-and-commodities"],
    },
  ],
};
