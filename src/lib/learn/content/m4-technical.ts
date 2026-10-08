import type { LearnModule } from "../types";

export const TECHNICAL: LearnModule = {
  slug: "technical-analysis",
  title: "Technical Analysis & Trading Tools",
  tagline: "Trends, indicators, scans, backtests and alerts",
  description:
    "Support and resistance, moving averages, RSI and MACD, chart patterns, and how to use the scanner, Trade Lab, backtesting, breadth and alerts to test ideas on real data.",
  level: "Intermediate",
  navSection: "Trade",
  accent: { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500" },
  chapters: [
    {
      slug: "support-resistance-trend",
      title: "Trend, support and resistance",
      summary: "The skeleton of every chart: which way price is going and where it tends to stall.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "A trend is a sequence of higher highs and higher lows (uptrend) or lower highs and lower lows (downtrend). Sideways markets trade in a range. Identify the trend first; most indicators work only in the right regime.",
          ],
        },
        {
          heading: "Support and resistance",
          paragraphs: [
            "Support is a price area where buyers have stepped in before; resistance is where sellers have. When broken, old resistance often becomes support and vice versa. The more times a level is tested, the more it matters, until it finally breaks.",
          ],
        },
        {
          heading: "Breakouts and fakeouts",
          paragraphs: [
            "A close beyond a level on rising volume is more convincing than an intraday poke. Many breakouts fail, so define where you would be wrong before you act.",
          ],
        },
      ],
      takeaways: [
        "Trend first, indicators second.",
        "Levels are zones, not exact lines.",
        "Volume confirms breakouts; always define invalidation.",
      ],
      tools: [
        { label: "Trade Lab", href: "/intelligence/trade-lab", blurb: "Chart any index or F&O stock with patterns and indicators." },
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "52-week high breakouts and higher-high scans." },
      ],
      related: ["technical-analysis/moving-averages", "market-foundations/how-to-read-a-candlestick-chart"],
    },
    {
      slug: "volume-and-liquidity",
      title: "Volume, liquidity and delivery",
      summary: "Why price without volume is a rumour, and how liquidity decides your real cost.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Volume is how many shares traded. A move on heavy volume reflects broad participation; the same move on thin volume is easier to reverse.",
          ],
        },
        {
          heading: "Practical reads",
          paragraphs: [],
          bullets: [
            "Breakout with volume well above average: stronger signal.",
            "Price up, volume falling: the move may be tiring.",
            "Very low volume days often precede sharp moves in narrow ranges.",
            "Illiquid stocks have wide bid-ask spreads: you pay to get in and out.",
          ],
        },
      ],
      takeaways: [
        "Volume validates price moves.",
        "Illiquidity is a hidden cost and a risk.",
        "Compare volume to the stock's own average.",
      ],
      tools: [
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "Volume gainers and lowest-volume scans." },
        { label: "Breadth & Momentum", href: "/markets/breadth", blurb: "Participation across the market." },
      ],
      related: ["market-foundations/what-is-a-circuit-limit"],
    },
    {
      slug: "moving-averages",
      title: "Moving averages, golden cross and death cross",
      summary: "Smooth the noise: how SMA and EMA define trend, and what the 50/200 crossovers mean.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "A moving average (MA) averages the last N closes. A simple MA (SMA) weights all days equally; an exponential MA (EMA) weights recent days more. Price above a rising MA indicates an uptrend.",
          ],
        },
        {
          heading: "Golden cross and death cross",
          paragraphs: [
            "A golden cross occurs when the 50-day average crosses above the 200-day average; a death cross is the reverse. They are slow, lagging confirmations of a trend change, not early signals, and they whipsaw in sideways markets.",
          ],
        },
        {
          heading: "Using MAs as dynamic support",
          paragraphs: ["In strong trends, pullbacks often hold near the 20, 50 or 200 period average."],
        },
      ],
      takeaways: [
        "MAs lag by design; they confirm rather than predict.",
        "50/200 crosses are long-term filters.",
        "Avoid MA crossover rules in range-bound markets.",
      ],
      tools: [
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "Golden cross and death cross scans." },
        { label: "Backtesting", href: "/intelligence/backtesting", blurb: "Test crossover rules against history." },
      ],
      related: ["technical-analysis/rsi-macd-momentum"],
    },
    {
      slug: "rsi-macd-momentum",
      title: "RSI, MACD and momentum indicators",
      summary: "Measure the speed of price moves: oversold, overbought, and trend momentum shifts.",
      minutes: 6,
      sections: [
        {
          heading: "RSI",
          paragraphs: [
            "The Relative Strength Index (0 to 100) compares recent gains with losses. Above 70 is conventionally overbought, below 30 oversold. In strong trends RSI can stay extreme for long, so use it for context, not automatic reversals.",
          ],
        },
        {
          heading: "MACD",
          paragraphs: [
            "MACD is the gap between a fast and slow EMA, with a signal line and histogram. A histogram crossing above zero shows rising bullish momentum; below zero, bearish.",
          ],
        },
        {
          heading: "Other momentum tools",
          paragraphs: ["Trade Lab covers a wider set, each with a different job:"],
          bullets: [
            "Stochastic, CCI, MFI: oscillators for overbought and oversold.",
            "ADX: trend strength (not direction).",
            "ATR: typical range, used for stops and sizing.",
            "Supertrend, Parabolic SAR, Aroon: trend-following signals.",
            "Ichimoku, VWAP, OBV: trend, average price and volume-flow views.",
          ],
        },
      ],
      takeaways: [
        "RSI/MACD describe momentum, not value.",
        "Combine one trend tool and one momentum tool; avoid stacking similar ones.",
        "Always test an indicator rule on history before trusting it.",
      ],
      tools: [
        { label: "Trade Lab", href: "/intelligence/trade-lab", blurb: "RSI, MACD and more indicators for any index or F&O stock." },
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "RSI oversold/overbought and RSI+MACD bullish scans." },
      ],
      related: ["technical-analysis/backtesting-basics"],
    },
    {
      slug: "chart-patterns",
      title: "Chart patterns: NR7, inside bars, VCP, double tops and bottoms",
      summary: "Common price structures the scanner and Trade Lab detect, and what each implies.",
      minutes: 6,
      sections: [
        {
          heading: "Volatility contraction",
          paragraphs: [
            "NR4 and NR7 mark the narrowest daily range in 4 or 7 sessions, often a coiled spring before expansion. A VCP (volatility contraction pattern, popularised by Mark Minervini) shows successively tighter pullbacks inside an uptrend.",
          ],
        },
        {
          heading: "Inside bars",
          paragraphs: [
            "An inside bar trades entirely within the prior bar's range, signalling pause. A break of the mother bar's high or low shows direction.",
          ],
        },
        {
          heading: "Double top and double bottom",
          paragraphs: [
            "Two peaks near the same level followed by a neckline break suggest a top; two troughs and a breakout above the neckline suggest a bottom. They need confirmation: the break, ideally with volume.",
          ],
        },
        {
          paragraphs: ["Patterns are probabilities, not rules; measure failure rates with a backtest."],
        },
      ],
      takeaways: [
        "Tight ranges tend to precede big moves, but not which direction.",
        "Wait for the trigger bar, not the setup alone.",
        "Backtest each pattern on your universe.",
      ],
      tools: [
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "NR4, NR7, VCP, inside bar and double top/bottom scans." },
        { label: "Trade Lab", href: "/intelligence/trade-lab", blurb: "Pattern detection and backtests." },
      ],
      related: ["technical-analysis/how-stock-screeners-work"],
    },
    {
      slug: "how-stock-screeners-work",
      legacySlug: "how-stock-screeners-work",
      title: "How stock screeners work",
      summary: "Screeners apply the same rule to every symbol in a universe such as the Nifty 500.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "A screener evaluates a rule on every symbol after the close (or on the latest bar). Results are descriptive: they list names that matched technical criteria, not recommendations.",
            "Always read why a filter matched. NR7, RSI and breakout rules measure different things, and a name appearing on many lists is not automatically stronger.",
          ],
        },
        {
          heading: "A sensible workflow",
          paragraphs: [],
          bullets: [
            "Pick a scan that fits your time horizon.",
            "Shortlist, then open the chart and check volume and trend.",
            "Check fundamentals and news for risks.",
            "Backtest the rule before relying on it.",
          ],
        },
      ],
      takeaways: [
        "Screeners narrow the universe; they do not pick winners.",
        "Match the scan to your holding period.",
        "Validate on a chart and with a backtest.",
      ],
      tools: [
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "Nifty 500 scans: breakouts, momentum, patterns." },
        { label: "Backtesting", href: "/intelligence/backtesting", blurb: "Test scanner ideas against history." },
      ],
      related: ["technical-analysis/backtesting-basics", "technical-analysis/alerts-guide"],
    },
    {
      slug: "backtesting-basics",
      title: "Backtesting: testing ideas on history",
      summary: "How to evaluate a rule before risking money, and the traps that make results look better than they are.",
      minutes: 6,
      sections: [
        {
          paragraphs: [
            "A backtest applies a rule to past data and records the outcomes: win rate, average gain and loss, drawdown. It answers whether the idea had an edge, not whether it will in future.",
          ],
        },
        {
          heading: "Traps",
          paragraphs: [],
          bullets: [
            "Overfitting: tuning until the past looks perfect.",
            "Look-ahead bias: using information not available at the time.",
            "Survivorship bias: testing only stocks that still exist.",
            "Ignoring costs: brokerage, taxes and slippage reduce real returns.",
            "Too few trades: small samples are noise.",
          ],
        },
        {
          heading: "What to look at",
          paragraphs: [
            "Look beyond total return: maximum drawdown, win rate versus payoff ratio, and consistency across years. Past results do not predict future returns.",
          ],
        },
      ],
      takeaways: [
        "A backtest supports or rejects an idea; it never proves it.",
        "Watch for overfitting, bias and costs.",
        "Prefer simple rules that hold across regimes.",
      ],
      tools: [
        { label: "Backtesting", href: "/intelligence/backtesting", blurb: "Test scanner ideas against history." },
        { label: "AI Signals", href: "/intelligence/ai-signals", blurb: "A next-day model with its published track record." },
        { label: "Trade Lab", href: "/intelligence/trade-lab", blurb: "Backtest patterns for any index or F&O stock." },
      ],
      related: ["sentiment-and-ai/ai-signals-explained"],
    },
    {
      slug: "market-breadth-and-momentum",
      title: "Market breadth and momentum",
      summary: "How many stocks are really participating, and why the index can lie.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Breadth measures participation: advancing versus declining stocks, stocks above their moving averages, and new highs versus new lows. A rally on narrowing breadth, carried by a few heavyweights, is more fragile than a broad one.",
          ],
        },
        {
          heading: "Reading it",
          paragraphs: [],
          bullets: [
            "Index up, advance/decline falling: narrow, weaker rally.",
            "Broad advance with many 52-week highs: healthy trend.",
            "Washed-out breadth after a fall can mark exhaustion.",
          ],
        },
      ],
      takeaways: [
        "Breadth shows the health beneath the headline.",
        "Divergence between index and breadth is a warning.",
        "Combine with volume and trend.",
      ],
      tools: [
        { label: "Breadth & Momentum", href: "/markets/breadth", blurb: "Advance/decline and trend leaders in one view." },
        { label: "Sector Map", href: "/markets/sectors", blurb: "Where participation is strongest." },
      ],
      related: ["market-foundations/indices-sensex-nifty"],
    },
    {
      slug: "trade-lab-guide",
      title: "Trade Lab: chart, indicate, backtest",
      summary: "A walkthrough of testing a trading idea end to end on any index or F&O stock.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Trade Lab brings charting, 15 indicators, pattern detection and backtests into one workspace for any index or F&O stock. It is built for turning a hunch into a testable rule.",
          ],
        },
        {
          heading: "A repeatable flow",
          paragraphs: [],
          bullets: [
            "Pick an instrument and look at the trend on a higher timeframe.",
            "Add one trend and one momentum indicator, not ten.",
            "Mark support and resistance, and the level that would prove you wrong.",
            "Backtest the rule and check drawdown, not just returns.",
            "Only then decide whether it deserves real capital.",
          ],
        },
      ],
      takeaways: [
        "Hypothesis, indicators, invalidation, backtest.",
        "Fewer indicators, clearer decisions.",
        "A tested rule beats a hunch.",
      ],
      tools: [
        { label: "Trade Lab", href: "/intelligence/trade-lab", blurb: "Indicators, patterns and backtests for any index or F&O stock." },
        { label: "Backtesting", href: "/intelligence/backtesting", blurb: "Test scanner ideas against history." },
      ],
      related: ["technical-analysis/rsi-macd-momentum", "technical-analysis/backtesting-basics"],
    },
    {
      slug: "alerts-guide",
      title: "Alerts: let the market come to you",
      summary: "Turn a scan or level into a notification so you do not have to stare at screens.",
      minutes: 3,
      sections: [
        {
          paragraphs: [
            "Alerts notify you when a rule triggers, such as a breakout, a price level or a scan match, on a schedule you choose. They are a discipline tool: decide the conditions in advance, act only when they hit.",
          ],
        },
        {
          heading: "Good alert habits",
          paragraphs: [],
          bullets: [
            "Alert on levels you have already analysed.",
            "Keep the list short so each alert means something.",
            "On trigger, re-check the chart and context before acting.",
          ],
        },
      ],
      takeaways: [
        "Pre-decide conditions; react only on triggers.",
        "Fewer, better alerts beat many noisy ones.",
        "An alert is a prompt to look, not an instruction to trade.",
      ],
      tools: [
        { label: "Alerts", href: "/intelligence/alerts", blurb: "Breakout and scan alerts on your schedule." },
        { label: "Stock Scanner", href: "/intelligence/scanner", blurb: "Create alerts from scan results." },
      ],
      related: ["technical-analysis/how-stock-screeners-work"],
    },
  ],
};
