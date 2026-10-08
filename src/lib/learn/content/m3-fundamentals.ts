import type { LearnModule } from "../types";

export const FUNDAMENTALS: LearnModule = {
  slug: "fundamental-analysis",
  title: "Fundamental Analysis",
  tagline: "Judge a business, not just a ticker",
  description:
    "Financial statements, valuation ratios, ROE vs ROCE, broker consensus, concalls and sector comparisons, with every concept linked to the matching research page.",
  level: "Intermediate",
  navSection: "Stocks",
  accent: { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  chapters: [
    {
      slug: "reading-financial-statements",
      title: "Reading financial statements",
      summary: "Profit & loss, balance sheet and cash flow: what each tells you and the red flags to look for.",
      minutes: 7,
      sections: [
        {
          paragraphs: [
            "Listed companies publish quarterly and annual statements. Three matter most, and they must be read together.",
          ],
        },
        {
          heading: "Profit & loss (income statement)",
          paragraphs: ["Shows revenue, costs and profit over a period."],
          bullets: [
            "Revenue growth: is the business expanding?",
            "Operating margin (EBITDA / revenue): pricing power and cost control.",
            "Net profit and EPS: what is left for shareholders.",
            "Watch for one-off gains inflating profit.",
          ],
        },
        {
          heading: "Balance sheet",
          paragraphs: ["A snapshot of what the company owns and owes on a date."],
          bullets: [
            "Debt to equity: how leveraged is it?",
            "Current ratio: can it cover near-term bills?",
            "Reserves and net worth: accumulated strength.",
          ],
        },
        {
          heading: "Cash flow statement",
          paragraphs: [
            "Profit is an accounting number; cash is real. Healthy firms convert profit into operating cash flow over time. Persistent profit with negative operating cash flow deserves scrutiny.",
          ],
        },
      ],
      takeaways: [
        "P&L shows performance, balance sheet shows strength, cash flow shows reality.",
        "Look at multi-year trends, not one quarter.",
        "Profit without cash flow is a warning sign.",
      ],
      tools: [
        { label: "Stock research page", href: "/research/HDFCBANK", blurb: "Key ratios, price and consensus for any symbol." },
        { label: "Company Page", href: "/intelligence/company", blurb: "Disclosures, timeline and AI what-changed summaries." },
      ],
      related: ["fundamental-analysis/roe-vs-roce-indian-stocks", "fundamental-analysis/valuation-ratios-pe-pb-ev"],
    },
    {
      slug: "valuation-ratios-pe-pb-ev",
      title: "Valuation ratios: P/E, P/B, EV/EBITDA, dividend yield",
      summary: "How to tell whether a price is rich or cheap relative to earnings, assets and cash flow.",
      minutes: 6,
      sections: [
        {
          paragraphs: ["A ratio makes companies comparable. None works alone; compare within a sector and against history."],
        },
        {
          heading: "The core four",
          paragraphs: [],
          bullets: [
            "P/E = price ÷ earnings per share. How many rupees you pay for one rupee of profit.",
            "P/B = price ÷ book value per share. Useful for banks and asset-heavy firms.",
            "EV/EBITDA = enterprise value ÷ operating earnings. Neutral to capital structure, good across leveraged peers.",
            "Dividend yield = annual dividend ÷ price. Income return, not total return.",
          ],
        },
        {
          heading: "Cheap is not always good",
          paragraphs: [
            "A low P/E can signal a value trap: earnings may be about to fall. A high P/E can be justified by fast, durable growth. Ask what growth and risk the multiple already prices in.",
          ],
        },
      ],
      takeaways: [
        "Use sector-appropriate ratios (P/B for banks, EV/EBITDA for capital-heavy firms).",
        "Compare to peers and to the stock's own history.",
        "A multiple is a question, not an answer.",
      ],
      tools: [
        { label: "Stock research page", href: "/research/RELIANCE", blurb: "Valuation ratios and price context per symbol." },
        { label: "Sector Valuation", href: "/markets/sectors?tab=valuation", blurb: "Index multiples compared with the 10-year G-Sec." },
        { label: "Sector Map", href: "/markets/sectors", blurb: "Peers side by side." },
      ],
      related: ["fundamental-analysis/nifty-pe-ratio-explained", "fundamental-analysis/sector-analysis"],
    },
    {
      slug: "nifty-pe-ratio-explained",
      legacySlug: "nifty-pe-ratio-explained",
      title: "Nifty P/E ratio: what it means",
      summary: "Index P/E compares the Nifty 50 price with combined earnings: a valuation thermometer, not a timing tool.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Index P/E divides the index level by trailing or forward earnings per share for the basket. A higher P/E means investors pay more per rupee of earnings, often when growth expectations or liquidity are strong.",
            "Compare P/E with its own long-run history and with bond yields. A high P/E with rising rates implies tighter conditions for equities; the earnings yield (1 ÷ P/E) versus the 10-year G-Sec yield is a quick gauge.",
          ],
        },
        {
          heading: "How to use it",
          paragraphs: [
            "Valuation tells you about future return potential over years, not next week. Markets can stay expensive for long stretches.",
          ],
        },
      ],
      takeaways: [
        "Nifty P/E is a rough thermometer of market expensiveness.",
        "Compare with history and the G-Sec yield.",
        "It does not time tops or bottoms.",
      ],
      tools: [
        { label: "Valuation", href: "/markets/sectors?tab=valuation", blurb: "Index multiples and the 10-year G-Sec." },
        { label: "India Markets", href: "/markets/india", blurb: "Nifty level and index depth." },
        { label: "Yields", href: "/macro/yields", blurb: "Bond yields across tenors." },
      ],
      related: ["macro-and-economy/bond-yields-explained"],
    },
    {
      slug: "roe-vs-roce-indian-stocks",
      legacySlug: "roe-vs-roce-indian-stocks",
      title: "ROE vs ROCE for Indian stocks",
      summary: "Two profitability measures from different capital bases, and when each is the right lens.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "ROE is net profit divided by shareholders' equity. ROCE is operating profit (EBIT) divided by capital employed, which is equity plus debt. Banks and lenders lean on ROE; capital-heavy industrials use ROCE to see whether debt-funded assets earn enough.",
          ],
        },
        {
          heading: "What good looks like",
          paragraphs: [],
          bullets: [
            "Consistently above the cost of capital across years.",
            "ROE driven by margins and asset turns, not just leverage.",
            "ROCE stable or rising as the company grows.",
          ],
        },
        {
          paragraphs: ["Compare both within the same sector and check whether earnings are cyclical or one-off."],
        },
      ],
      takeaways: [
        "ROE = profit ÷ equity; ROCE = EBIT ÷ (equity + debt).",
        "High ROE from heavy debt is lower quality.",
        "Judge returns over multiple years, within a sector.",
      ],
      tools: [
        { label: "Stock research page", href: "/research/HDFCBANK", blurb: "Fundamentals on a symbol page." },
        { label: "Key ratios metric guide", href: "/help", blurb: "Definitions for the ratios shown across the site." },
      ],
      related: ["fundamental-analysis/valuation-ratios-pe-pb-ev"],
    },
    {
      slug: "broker-consensus-and-targets",
      title: "Broker consensus, targets and MI research notes",
      summary: "How to use analyst ratings and price targets without being led by them.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Brokerages publish a rating (buy, hold, sell) and a 12-month target price. Consensus aggregates many such views into an average target and a spread of opinion.",
          ],
        },
        {
          heading: "Using consensus well",
          paragraphs: [],
          bullets: [
            "Look at the dispersion: tight consensus means agreement, wide means uncertainty.",
            "Track revisions: rising estimates are a stronger signal than a static rating.",
            "Remember incentives: brokers skew positive and often lag price.",
            "Check the analyst's track record before leaning on a target.",
          ],
        },
        {
          heading: "MI Research Notes",
          paragraphs: [
            "Model-driven notes across the coverage list summarise valuation, momentum and quality in a consistent format, so you can compare names quickly. They are research information, not recommendations.",
          ],
        },
      ],
      takeaways: [
        "A target is an opinion with a time horizon.",
        "Revisions and dispersion matter more than the label.",
        "Cross-check with your own valuation work.",
      ],
      tools: [
        { label: "Broker Consensus", href: "/research", blurb: "Broker targets, consensus and what changed." },
        { label: "MI Research Notes", href: "/research-reports", blurb: "Model-driven notes across the coverage list." },
        { label: "AI Desk", href: "/research/ai-desk", blurb: "Bull vs bear debate with sources." },
      ],
      related: ["sentiment-and-ai/ai-desk-explained"],
    },
    {
      slug: "company-disclosures-and-concalls",
      title: "Company disclosures, concalls and the corporate timeline",
      summary: "Where the real information is: exchange filings, earnings calls and investor presentations.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Listed companies must disclose material events to the exchanges. These filings often move prices before any news story is written.",
          ],
        },
        {
          heading: "What to watch",
          paragraphs: [],
          bullets: [
            "Quarterly results and the investor presentation.",
            "Earnings call (concall) transcripts: management tone, guidance and Q&A.",
            "Board outcomes: dividends, buybacks, fundraisers, mergers.",
            "Shareholding pattern changes and auditor remarks.",
            "Credit rating and legal disclosures.",
          ],
        },
        {
          heading: "Reading a concall",
          paragraphs: [
            "Listen for changes in language: guidance cuts, new risks, repeated analyst questions that management dodges. A quick AI summary helps, but always check the source.",
          ],
        },
      ],
      takeaways: [
        "Filings are primary sources; news is secondary.",
        "Track what changed since last quarter, not only the numbers.",
        "Guidance and tone are leading indicators.",
      ],
      tools: [
        { label: "Company Page", href: "/intelligence/company", blurb: "IR disclosures, timeline and AI what-changed summaries." },
        { label: "Economic Calendar", href: "/macro/calendar", blurb: "Upcoming releases that can move markets." },
      ],
      related: ["ownership-and-risk/legal-and-regulatory-risk"],
    },
    {
      slug: "sector-analysis",
      title: "Sector analysis and relative valuation",
      summary: "Why sectors lead and lag, and how to compare a company with its peers.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Sectors move in cycles tied to rates, commodities, currency and policy. Banks like rising credit growth; IT benefits from a weaker rupee; autos from falling fuel prices and rural demand.",
          ],
        },
        {
          heading: "Relative valuation",
          paragraphs: [
            "Compare a stock with sector peers on growth, margins, returns and multiples. A premium needs a reason: better growth, higher returns, a stronger balance sheet.",
          ],
        },
        {
          heading: "Rotation",
          paragraphs: [
            "Leadership rotates as conditions change. Sector performance and breadth show where money is flowing right now.",
          ],
        },
      ],
      takeaways: [
        "Sector context explains a large share of a stock's move.",
        "Compare like with like; premiums need justification.",
        "Watch rotation through performance and breadth.",
      ],
      tools: [
        { label: "Sector Map", href: "/markets/sectors", blurb: "Sector performance and comparables." },
        { label: "How Shocks Spread", href: "/macro/transmission", blurb: "Which sectors move when oil, INR or US yields jump." },
        { label: "Breadth & Momentum", href: "/markets/breadth", blurb: "Trend leaders in one view." },
      ],
      related: ["macro-and-economy/shock-transmission-and-scenarios"],
    },
  ],
};
