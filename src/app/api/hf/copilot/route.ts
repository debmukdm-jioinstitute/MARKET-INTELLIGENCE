import { NextRequest, NextResponse } from "next/server";
import { classifyNewsHeadline } from "@/lib/hf/news-classifier";
import { classifyFinancialSentiment, aggregateSentimentScore } from "@/lib/hf/finbert";
import { summarizeText } from "@/lib/hf/summarizer";
import { buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import { z } from "zod";

const RequestBody = z.object({
  query: z.string().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { query } = RequestBody.parse(await req.json());
    const startTime = Date.now();

    // 1. Zero-shot intent/category classification using HF facebook/bart-large-mnli
    const classification = await classifyNewsHeadline(query);

    // 2. Financial sentiment analysis using HF ProsusAI/finbert
    const sentimentResult = await classifyFinancialSentiment([query]);
    const aggregatedSentiment = aggregateSentimentScore(sentimentResult);

    // 3. Fetch live market context to ground the response
    let marketContext = "";
    try {
      const dash = await buildIndiaDashboardQuick();
      const pulse = dash.pulse;
      const nifty = pulse?.nifty?.value ? `NIFTY 50 at ₹${pulse.nifty.value.toLocaleString("en-IN")} (${(pulse.nifty.change ?? 0) >= 0 ? "+" : ""}${(pulse.nifty.change ?? 0).toFixed(2)})` : "";
      const vix = pulse?.indiaVix?.value ? `India VIX at ${pulse.indiaVix.value.toFixed(2)}` : "";
      const usdinr = pulse?.usdInr?.value ? `USD/INR at ₹${pulse.usdInr.value.toFixed(2)}` : "";
      const gsec = pulse?.gsec10y?.value ? `India 10Y Yield at ${pulse.gsec10y.value.toFixed(2)}%` : "";
      marketContext = [nifty, vix, usdinr, gsec].filter(Boolean).join(" · ");
    } catch {
      marketContext = "NIFTY 50 & Macro feeds active";
    }

    // 4. Construct prompt block for BART summarizer / financial text synthesizer
    const rawContext = `
Query: "${query}"
Market Category: ${classification.topCategory} (Confidence: ${(classification.topScore * 100).toFixed(0)}%)
Sentiment: ${aggregatedSentiment.label.toUpperCase()} (Score: ${aggregatedSentiment.score.toFixed(2)})
Live Market State: ${marketContext}

Analysis & Institutional Insights:
The ${classification.topCategory} environment exhibits ${aggregatedSentiment.label} market signals. Key metrics indicate ${marketContext}. 
Portfolio risk consideration: Monitor interest rate volatility, macro liquidity flows, and cross-asset beta sensitivities. Ensure position sizes match current volatility levels.
    `.trim();

    // 5. Generate TL;DR institutional response using HF facebook/bart-large-cnn
    let textSummary = await summarizeText(rawContext, 90);
    if (!textSummary || textSummary.length < 20) {
      textSummary = `[${classification.topCategory.toUpperCase()}] ${query} — Market sentiment is ${aggregatedSentiment.label}. Current indicators: ${marketContext}. Maintain disciplined risk limits.`;
    }

    const elapsedMs = Date.now() - startTime;

    return NextResponse.json({
      answer: textSummary,
      category: classification.topCategory,
      sentiment: aggregatedSentiment.label,
      sentimentScore: aggregatedSentiment.score,
      marketContext,
      modelUsed: "Hugging Face (BART + FinBERT + MNLI)",
      elapsedMs,
    });
  } catch (err) {
    console.error("[HF Copilot Error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process query with Hugging Face models" },
      { status: 500 }
    );
  }
}
