export type LearnArticle = {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  productHref: string;
  productLabel: string;
  sections: { heading?: string; paragraphs: string[] }[];
};

export const LEARN_ARTICLES: LearnArticle[] = [
  {
    slug: "what-is-ipo-gmp",
    title: "What is IPO GMP?",
    description:
      "Grey market premium (GMP) is an unofficial signal for IPO listing demand — not an exchange price or a guarantee.",
    published: "2026-09-01",
    updated: "2026-09-29",
    productHref: "/research/ipo",
    productLabel: "IPO tracker",
    sections: [
      {
        paragraphs: [
          "Grey market premium (GMP) is the unofficial price investors quote for shares before listing. It reflects sentiment in over-the-counter deals, not the price band set by the company or bids on NSE/BSE.",
          "A positive GMP often means buyers expect the stock to list above the issue price; a negative GMP suggests the opposite. GMP can change quickly and may be wrong after listing.",
        ],
      },
      {
        heading: "Why it matters",
        paragraphs: [
          "Retail investors use GMP as one input alongside the DRHP, financials, and subscription data. It is not regulated like exchange quotes and should never be treated as a promise of listing gains.",
        ],
      },
    ],
  },
  {
    slug: "how-to-read-a-candlestick-chart",
    title: "How to read a candlestick chart",
    description: "Candlesticks show open, high, low and close for each period — the basis of most price charts on the site.",
    published: "2026-09-01",
    updated: "2026-09-29",
    productHref: "/research/RELIANCE",
    productLabel: "Stock research",
    sections: [
      {
        paragraphs: [
          "Each candle covers one time period (for example one day). The body spans open to close; wicks show the high and low. Green or up candles mean close above open; down candles mean close below open.",
          "Patterns only make sense with volume, trend context, and corporate events — a single candle is not a buy or sell signal.",
        ],
      },
    ],
  },
  {
    slug: "nifty-pe-ratio-explained",
    title: "Nifty P/E ratio: what it means",
    description: "Index P/E compares Nifty 50 price to combined earnings — a rough valuation thermometer, not a timing tool.",
    published: "2026-09-05",
    updated: "2026-09-29",
    productHref: "/markets/india",
    productLabel: "Markets hub",
    sections: [
      {
        paragraphs: [
          "Price-to-earnings (P/E) divides index level by trailing or forward earnings per share for the basket. Higher P/E usually means investors pay more per rupee of earnings — often when growth expectations or liquidity are strong.",
          "Compare P/E to its own history and to bond yields; a high P/E with rising rates can mean tighter conditions for equities.",
        ],
      },
    ],
  },
  {
    slug: "fii-dii-data-explained",
    title: "FII and DII data explained",
    description: "Foreign and domestic institutional flows show who is net buying or selling Indian equities in the cash market.",
    published: "2026-09-05",
    updated: "2026-09-29",
    productHref: "/intelligence/brief",
    productLabel: "Daily market brief",
    sections: [
      {
        paragraphs: [
          "FII (foreign institutional investors) and DII (domestic institutions) publish provisional net figures for NSE cash segments. Positive net FII buying means foreigners added exposure on that day; DIIs often offset FII selling in recent cycles.",
          "Daily flows are noisy. Use several sessions and index price action together — flows alone do not predict the next day.",
        ],
      },
    ],
  },
  {
    slug: "how-stock-screeners-work",
    title: "How stock screeners work",
    description: "Screeners filter a universe (for example Nifty 500) by rules such as breakouts, volume spikes, or moving-average crosses.",
    published: "2026-09-08",
    updated: "2026-09-29",
    productHref: "/intelligence/scanner",
    productLabel: "Nifty 500 scanner",
    sections: [
      {
        paragraphs: [
          "A screener runs the same rule on every symbol after the market close (or on the latest available bar). Results are descriptive: they highlight names that matched technical criteria, not recommendations.",
          "Always read why a filter matched — NR7, RSI, and breakout rules mean different things.",
        ],
      },
    ],
  },
  {
    slug: "roe-vs-roce-indian-stocks",
    title: "ROE vs ROCE for Indian stocks",
    description: "Return on equity (ROE) and return on capital employed (ROCE) measure profitability from different capital bases.",
    published: "2026-09-10",
    updated: "2026-09-29",
    productHref: "/research/HDFCBANK",
    productLabel: "Fundamentals on a symbol page",
    sections: [
      {
        paragraphs: [
          "ROE is net profit divided by shareholders' equity. ROCE uses operating profit relative to equity plus debt. Banks and lenders often emphasise ROE; capital-heavy industrials benefit from ROCE to see if debt-funded assets earn enough.",
          "Compare both within the same sector and check whether earnings are cyclical or one-off.",
        ],
      },
    ],
  },
  {
    slug: "ipo-price-band-explained",
    title: "How to read an IPO price band",
    description: "The price band is the min–max issue price per share; your bid must fall inside it unless using the cut-off price.",
    published: "2026-09-12",
    updated: "2026-09-29",
    productHref: "/research/ipo",
    productLabel: "IPO tracker",
    sections: [
      {
        paragraphs: [
          "Companies publish a floor and cap (for example ₹100–₹105). Retail investors choose a price inside the band or tick cut-off to accept the final issue price. Lot size × bid price sets application amount.",
          "Pre-apply (where offered) blocks UPI limits before bidding opens — it is not the same as a confirmed allotment.",
        ],
      },
    ],
  },
  {
    slug: "market-cap-large-mid-small",
    title: "Market cap: large, mid and small cap",
    description: "Market capitalisation groups companies by total equity value — indices like Nifty 50, Midcap 150, and Smallcap 250 use cut-offs.",
    published: "2026-09-15",
    updated: "2026-09-29",
    productHref: "/intelligence/scanner",
    productLabel: "Scanner filters",
    sections: [
      {
        paragraphs: [
          "Large caps tend to be more liquid with broader analyst coverage. Mid and small caps can move more sharply but carry liquidity and governance risks. NSE index rules define membership by float-adjusted market cap ranks.",
        ],
      },
    ],
  },
  {
    slug: "what-is-a-circuit-limit",
    title: "What is a circuit limit?",
    description: "Circuit limits pause trading when price moves beyond exchange-set bands for a session — a risk control, not a company verdict.",
    published: "2026-09-18",
    updated: "2026-09-29",
    productHref: "/markets/india",
    productLabel: "Markets hub",
    sections: [
      {
        paragraphs: [
          "Upper and lower circuits stop matching temporarily when a stock hits the daily band (often 2%, 5%, 10%, or 20% depending on category). Trading may resume in auctions or the next session. Circuits can follow news, results, or index rebalances.",
        ],
      },
    ],
  },
  {
    slug: "portfolio-diversification-basics",
    title: "Portfolio diversification for beginners",
    description: "Spreading holdings across sectors and regions reduces reliance on one company or theme — it does not remove market risk.",
    published: "2026-09-22",
    updated: "2026-09-29",
    productHref: "/portfolio",
    productLabel: "Portfolio (sign in to save)",
    sections: [
      {
        paragraphs: [
          "Diversification limits damage when one name or sector falls. A simple start is a core of liquid large caps plus measured sector weights, then review concentration when adding mid caps or US listings.",
          "Use allocation and risk views after adding holdings — descriptive metrics, not advice.",
        ],
      },
    ],
  },
];

export function getLearnArticle(slug: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.slug === slug);
}
