import type { SentimentLabel } from "@/lib/hf/finbert";
import { aggregateSentimentScore, type FinBertResult } from "@/lib/hf/finbert";
import { scoreHeadlineLexicon } from "@/lib/feeds/sentiment-lexicon";

export type NewsIntelSentiment = {
  score: number;
  label: SentimentLabel;
  confidence: number;
  breakdown: { positive: number; negative: number; neutral: number };
  mode: "finbert" | "lexicon";
};

export type SentimentDriver = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  reason: string;
};

export type NewsIntelSentimentWithExplanation = NewsIntelSentiment & {
  rationale: string;
  drivers: {
    positive: SentimentDriver[];
    negative: SentimentDriver[];
    neutral: SentimentDriver[];
  };
};

export type NewsIntelItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  publishedAt?: string;
  sentiment: {
    label: SentimentLabel;
    score: number;
    impact: "+ve" | "-ve" | "neutral";
    reason: string;
  };
  category?: string;
};

export function formatNewsSource(source: string): string {
  switch (source?.toLowerCase()) {
    case "rbi":
      return "Reserve Bank of India";
    case "bse":
      return "BSE India";
    case "nse":
      return "NSE India";
    case "livemint":
      return "Livemint";
    case "moneycontrol":
      return "Moneycontrol";
    case "busstd":
      return "Business Standard";
    case "googlenews":
      return "Google News";
    case "sec":
      return "US SEC";
    default:
      return source?.toUpperCase() || "Market Feed";
  }
}

export function explainHeadlineSentiment(
  title: string,
  label: SentimentLabel,
  source?: string,
): string {
  const lower = title.toLowerCase();

  if (label === "positive") {
    if (/profit|surge|jump|beat|record|rise|rally|soar/i.test(lower)) {
      return "Earnings / price outperformance providing positive tailwind (+ve)";
    }
    if (/order|contract|win|deal|partnership|collaborat|invest/i.test(lower)) {
      return "Order inflow and strategic deal expansion (+ve)";
    }
    if (/nfo|fund|ipo|inflow|listing|allotment/i.test(lower)) {
      return "Institutional product launch & capital mobilization (+ve)";
    }
    if (/dividend|buyback|bonus|split/i.test(lower)) {
      return "Shareholder capital returns accretive to valuation (+ve)";
    }
    return "Constructive corporate / macro catalyst supporting market tone (+ve)";
  }

  if (label === "negative") {
    if (/slide|fall|slump|drop|crash|down|plunge|loss/i.test(lower)) {
      return "Downward price pressure & risk-off market contraction (-ve)";
    }
    if (/probe|fraud|scam|penalty|investigat|notice|dispute/i.test(lower)) {
      return "Regulatory investigation or corporate governance overhang (-ve)";
    }
    if (/debt|default|downgrade|bankrupt|crisis|strain/i.test(lower)) {
      return "Balance sheet leverage risk or credit profile stress (-ve)";
    }
    if (/inflation|hike|war|geopolitic|tariff|curb/i.test(lower)) {
      return "Macro rate pressure or geopolitical drag factor (-ve)";
    }
    return "Market risk drag dampening risk appetite (-ve)";
  }

  // Neutral
  if (/vrrr|reverse repo|repo|auction|treasury bill|t-bill|borrowing|bond/i.test(lower)) {
    return "Sovereign liquidity operation / routine central bank auction (Neutral)";
  }
  if (/meeting|intimation|schedule|annual general|agm|scrutinizer|press release/i.test(lower)) {
    return "Routine statutory corporate notice without systemic volatility (Neutral)";
  }
  if (/rate of interest|floating rate|calendar|statutory/i.test(lower)) {
    return "Scheduled macroeconomic rate or calendar disclosure (Neutral)";
  }
  return "Informational market update with balanced risk impact (Neutral)";
}

export function buildMarketSentimentRationale(
  sentiment: NewsIntelSentiment,
  items: NewsIntelItem[],
): {
  rationale: string;
  drivers: NewsIntelSentimentWithExplanation["drivers"];
} {
  const positive = items
    .filter((it) => it.sentiment.label === "positive")
    .map((it) => ({
      id: it.id,
      title: it.title,
      url: it.url,
      source: it.source,
      sourceLabel: it.sourceLabel,
      reason: it.sentiment.reason,
    }));

  const negative = items
    .filter((it) => it.sentiment.label === "negative")
    .map((it) => ({
      id: it.id,
      title: it.title,
      url: it.url,
      source: it.source,
      sourceLabel: it.sourceLabel,
      reason: it.sentiment.reason,
    }));

  const neutral = items
    .filter((it) => it.sentiment.label === "neutral")
    .map((it) => ({
      id: it.id,
      title: it.title,
      url: it.url,
      source: it.source,
      sourceLabel: it.sourceLabel,
      reason: it.sentiment.reason,
    }));

  let rationale = "";
  const confPct = Math.round(sentiment.confidence * 100);

  if (sentiment.label === "positive") {
    const lead = positive[0]?.title ? `"${positive[0].title.slice(0, 65)}..."` : "strong earnings and deal wins";
    rationale = `Market sentiment is Bullish (+ve · ${confPct}% confidence), propelled by positive catalysts such as ${lead}.`;
    if (negative.length > 0) {
      rationale += ` Selective drag remains from "${negative[0].title.slice(0, 65)}...", but upside drivers dominate.`;
    }
  } else if (sentiment.label === "negative") {
    const lead = negative[0]?.title ? `"${negative[0].title.slice(0, 65)}..."` : "market contraction and regulatory headwinds";
    rationale = `Market sentiment leans Cautious / Bearish (-ve · ${confPct}% confidence), weighed down by ${lead}.`;
    if (positive.length > 0) {
      rationale += ` Mild support is noted from "${positive[0].title.slice(0, 65)}...", but broader risk appetite remains restrained.`;
    }
  } else {
    // Neutral
    if (positive.length > 0 && negative.length > 0) {
      rationale = `Market sentiment is Balanced / Neutral (↔ · ${confPct}% confidence), as positive expansion catalysts ("${positive[0].title.slice(
        0,
        50,
      )}...") are offset by cautious price headwinds ("${negative[0].title.slice(0, 50)}...").`;
    } else if (neutral.length > 0 && /rbi|vrrr|treasury|auction|bond/i.test(neutral[0].title)) {
      rationale = `Market sentiment is holding Neutral (↔ · ${confPct}% confidence). Today's news feed is led by routine sovereign debt auctions and RBI liquidity operations (VRRR & T-Bills), which maintain orderly financial conditions without systemic market shocks.`;
    } else {
      rationale = `Market sentiment is holding Neutral (↔ · ${confPct}% confidence). Current news flows consist primarily of standard corporate statutory disclosures and baseline institutional filings with balanced directional impact.`;
    }
  }

  return {
    rationale,
    drivers: {
      positive: positive.slice(0, 3),
      negative: negative.slice(0, 3),
      neutral: neutral.slice(0, 3),
    },
  };
}

export function aggregateLexiconHeadlines(headlines: string[]): NewsIntelSentiment {
  if (headlines.length === 0) {
    return {
      score: 0,
      label: "neutral",
      confidence: 0,
      breakdown: { positive: 0, negative: 0, neutral: 0 },
      mode: "lexicon",
    };
  }

  let pos = 0;
  let neg = 0;
  let neu = 0;
  let scoreSum = 0;

  for (const title of headlines) {
    const { score, label } = scoreHeadlineLexicon(title);
    scoreSum += Math.max(-1, Math.min(1, score / 2));
    if (label === "positive") pos += 1;
    else if (label === "negative") neg += 1;
    else neu += 1;
  }

  const n = headlines.length;
  const breakdown = { positive: pos / n, negative: neg / n, neutral: neu / n };
  const avgScore = scoreSum / n;
  const label: SentimentLabel =
    avgScore > 0.08 ? "positive" : avgScore < -0.08 ? "negative" : "neutral";
  const confidence = Math.max(breakdown.positive, breakdown.negative, breakdown.neutral);

  return { score: avgScore, label, confidence, breakdown, mode: "lexicon" };
}

export function finbertToNewsIntel(results: FinBertResult[]): NewsIntelSentiment {
  const agg = aggregateSentimentScore(results);
  return { ...agg, mode: "finbert" };
}

export function buildFallbackTldr(headlines: string[], label: SentimentLabel): string {
  const themes = headlines
    .slice(0, 4)
    .map((h) => h.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ");
  if (!themes) return "No headlines available to summarize right now.";
  return `Desk scan of ${headlines.length} headlines reads ${label}. Highlights: ${themes}.`.slice(0, 420);
}
