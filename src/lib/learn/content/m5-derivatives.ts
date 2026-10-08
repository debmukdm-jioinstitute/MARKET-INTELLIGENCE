import type { LearnModule } from "../types";

export const DERIVATIVES: LearnModule = {
  slug: "derivatives-and-options",
  title: "Derivatives & Options Flow",
  tagline: "Futures, options, open interest and positioning",
  description:
    "What F&O are, how to read open interest and option chains, what unusual options activity means, and how option strategies are built.",
  level: "Advanced",
  navSection: "Trade",
  accent: { text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
  chapters: [
    {
      slug: "futures-and-options-basics",
      title: "Futures and options basics",
      summary: "Contracts that derive their value from an underlying stock or index: lots, expiry, margin and leverage.",
      minutes: 6,
      sections: [
        {
          paragraphs: [
            "A derivative's price depends on an underlying asset. In India, NSE offers futures and options (F&O) on indices such as Nifty and Bank Nifty and on selected stocks.",
          ],
        },
        {
          heading: "Futures",
          paragraphs: [
            "A future is an obligation to buy or sell the underlying at a set price on expiry. You pay margin, not full value, so gains and losses are amplified and settled daily.",
          ],
        },
        {
          heading: "Options",
          paragraphs: [
            "A call gives the right to buy and a put the right to sell at the strike price before or at expiry. The buyer pays a premium and risk is limited to it; the seller receives the premium and takes on potentially large risk.",
          ],
        },
        {
          heading: "Key terms",
          paragraphs: [],
          bullets: [
            "Lot size: contracts trade in fixed lots.",
            "Strike and expiry: the price level and the date.",
            "In/at/out of the money: where spot sits relative to strike.",
            "Time decay (theta): option value erodes as expiry approaches.",
          ],
        },
      ],
      takeaways: [
        "Leverage cuts both ways; most retail F&O traders lose money.",
        "Option buyers have limited risk; sellers do not.",
        "Time decay works against buyers every day.",
      ],
      tools: [
        { label: "Derivatives", href: "/markets/derivatives", blurb: "F&O open interest and positioning." },
        { label: "Trade Lab", href: "/intelligence/trade-lab", blurb: "Chart any F&O stock with indicators." },
      ],
      related: ["derivatives-and-options/open-interest-and-pcr", "derivatives-and-options/option-chain-and-greeks"],
    },
    {
      slug: "open-interest-and-pcr",
      title: "Open interest, PCR and positioning",
      summary: "Read what traders are holding, not just what they traded.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Open interest (OI) is the number of outstanding contracts. Rising OI with rising price suggests fresh long positions; rising OI with falling price suggests fresh shorts. Falling OI means positions are being closed.",
          ],
        },
        {
          heading: "Put-call ratio (PCR)",
          paragraphs: [
            "PCR divides put OI (or volume) by call OI. Very high PCR can reflect heavy hedging or bearishness; very low PCR can reflect complacency. It is often used as a contrarian gauge at extremes.",
          ],
        },
        {
          heading: "Max pain and OI walls",
          paragraphs: [
            "Strikes with large call OI act as resistance and large put OI as support in practice, particularly near expiry. These are tendencies, not guarantees.",
          ],
        },
      ],
      takeaways: [
        "OI + price together tell you who is entering.",
        "PCR is a sentiment gauge, strongest at extremes.",
        "OI walls shape expiry-week behaviour.",
      ],
      tools: [
        { label: "Derivatives", href: "/markets/derivatives", blurb: "Open interest and positioning by contract." },
        { label: "Options Flow", href: "/research/options-flow", blurb: "Unusual activity across the options tape." },
      ],
      related: ["derivatives-and-options/option-chain-and-greeks"],
    },
    {
      slug: "option-chain-and-greeks",
      title: "Reading an option chain and the Greeks",
      summary: "Strikes, premiums, implied volatility and how delta, theta, gamma and vega describe risk.",
      minutes: 7,
      sections: [
        {
          paragraphs: [
            "An option chain lists calls on one side and puts on the other for every strike of an expiry, with premium, OI, volume and implied volatility (IV).",
          ],
        },
        {
          heading: "Implied volatility",
          paragraphs: [
            "IV is the volatility the market is pricing in. High IV makes options expensive; IV usually drops after events such as results or elections (IV crush).",
          ],
        },
        {
          heading: "The Greeks",
          paragraphs: [],
          bullets: [
            "Delta: change in option price per ₹1 move in the underlying; also a rough probability of finishing in the money.",
            "Gamma: how fast delta changes; highest near the money close to expiry.",
            "Theta: daily time decay.",
            "Vega: sensitivity to a change in IV.",
          ],
        },
      ],
      takeaways: [
        "IV is the price of uncertainty.",
        "Delta, gamma, theta and vega each isolate one risk.",
        "Buying options before events means paying for IV that may collapse.",
      ],
      tools: [
        { label: "Options Flow", href: "/research/options-flow", blurb: "Chains, flow and flags." },
        { label: "Derivatives", href: "/markets/derivatives", blurb: "Positioning across expiries." },
      ],
      related: ["derivatives-and-options/option-strategies"],
    },
    {
      slug: "option-strategies",
      title: "Option strategies: spreads, theta and defined risk",
      summary: "How combining legs caps risk, and what an options strategy lab is showing you.",
      minutes: 6,
      sections: [
        {
          paragraphs: [
            "A single option leg has either unlimited risk (sold) or total premium loss (bought). Combining legs shapes the payoff so max profit and max loss are known upfront.",
          ],
        },
        {
          heading: "Common structures",
          paragraphs: [],
          bullets: [
            "Bull call / bear put spread: directional with capped cost and capped gain.",
            "Credit spreads: collect premium, with defined maximum loss.",
            "Iron condor: profit if price stays in a range.",
            "Straddle/strangle: bet on a large move either way.",
          ],
        },
        {
          paragraphs: [
            "Check margin, breakevens, probability of profit and what happens as expiry nears. Defined risk does not mean low risk.",
          ],
        },
      ],
      takeaways: [
        "Spreads trade away some upside for capped downside.",
        "Always know breakevens and max loss before entry.",
        "Strategy outputs are illustrations, not advice.",
      ],
      tools: [
        { label: "Options Flow", href: "/research/options-flow", blurb: "Unusual activity that may inspire a setup." },
        { label: "AI Desk", href: "/research/ai-desk", blurb: "Debate the underlying before you structure a trade." },
      ],
      related: ["derivatives-and-options/unusual-options-activity"],
    },
    {
      slug: "unusual-options-activity",
      title: "Unusual options activity and how to use it",
      summary: "What a flag on the options tape does and does not tell you.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Options flow highlights contracts with volume or OI far above normal. Unusual activity can reflect large directional bets, hedges or spread legs, and you cannot tell which from a single print.",
          ],
        },
        {
          heading: "How to use a flag",
          paragraphs: [],
          bullets: [
            "Treat it as a prompt to investigate, not a signal.",
            "Check whether volume is mostly at one strike, or spread across several legs.",
            "Cross-check price action, news and OI changes next day.",
          ],
        },
      ],
      takeaways: [
        "Flow shows activity, not intent.",
        "Hedges and spreads look like directional bets in isolation.",
        "Confirm with OI change and price behaviour.",
      ],
      tools: [
        { label: "Options Flow", href: "/research/options-flow", blurb: "Unusual activity across the options tape." },
        { label: "Alerts", href: "/intelligence/alerts", blurb: "Be notified when conditions hit." },
      ],
      related: ["derivatives-and-options/open-interest-and-pcr"],
    },
  ],
};
