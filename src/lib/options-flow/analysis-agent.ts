import { callLlmJson } from "@/lib/ai/llm";
import type { AnalysisOutput, TickerBaseline } from "@/lib/options-flow/types";
import { z } from "zod";

/**
 * The Analysis Agent. Per the doc: reads the data, describes what it sees, never
 * recommends a trade, and — critically — never describes activity as bullish or
 * bearish, only as activity. It is handed nothing but the deterministic numbers
 * from `computeTickerBaseline`; it cannot see raw feeds and cannot invent figures.
 */

const SYSTEM_PROMPT = `You are a market analysis agent. You read pre-computed statistics about options activity and describe what they show. You never analyze raw data yourself and never recommend a trade.

Rules, non-negotiable:
- Never use the words bullish, bearish, buy, sell, rally, tank, surge, plunge, upside, or downside, or any synonym that assigns market direction or intent. Describe activity as activity, not as a signal.
- Raw options volume does not reveal whether a trade was buying or selling, whether it opened or closed a position, or whether it was directional or a hedge. When you flag a ticker, you must say plainly that you cannot determine these things from this data.
- Rank by how unusual the activity is relative to that specific ticker's own history (the z-score you're given), never by absolute size.
- If the ticker's own 30-day options-volume baseline is not yet available (insufficient history), say so plainly instead of guessing at a range.
- Flag a ticker only when told candidateFlag is true, i.e. unusual options volume opened new positions and price has not moved correspondingly. Otherwise flagged must be false.

For each ticker return a JSON object with these exact string fields (2-3 sentences each, plain factual prose, no markdown):
- volumeVsRange: where today's options volume sits relative to its own normal range, with the numbers.
- callPutRatioNote: today's call/put ratio versus its own 30-day average, with the numbers, or a note that the baseline isn't established yet.
- openInterestNote: whether open interest actually increased (new positions opened) or decreased (positions closed) at the active strikes, with the strikes and numbers.
- priceConfirmationNote: whether price action confirms or contradicts what the options activity suggests, stated as description not interpretation.
- scheduledEventNote: state plainly that no earnings/dividend/event calendar is available for this ticker, so this cannot be checked.
- flagged: boolean, must equal the given candidateFlag.
- uncertaintyNote: for a flagged ticker, state plainly what cannot be determined (buying vs selling, opening vs closing for the counterparty, directional vs hedge). For a non-flagged ticker, this can be a short "not flagged" note.`;

const AnalysisSchema = z.object({
  volumeVsRange: z.string().min(1).max(500),
  callPutRatioNote: z.string().min(1).max(500),
  openInterestNote: z.string().min(1).max(500),
  priceConfirmationNote: z.string().min(1).max(500),
  scheduledEventNote: z.string().min(1).max(500),
  flagged: z.boolean(),
  uncertaintyNote: z.string().min(1).max(500),
});

const BANNED_WORDS = /\b(bullish|bearish|buy|sell|rally|tank|surge|plunge|upside|downside)\b/i;

function sanitize(text: string): string {
  return BANNED_WORDS.test(text)
    ? "Description withheld: the model's output used directional language this screener does not permit. Treat this ticker's numbers as data only."
    : text;
}

function fmt(n: number | null, digits = 2): string {
  return n == null ? "unavailable" : n.toFixed(digits);
}

export async function runAnalysisAgent(baselines: TickerBaseline[]): Promise<AnalysisOutput[]> {
  const out: AnalysisOutput[] = [];

  for (const b of baselines) {
    const unusualnessScore = b.optionsVolumeZ != null ? Math.abs(b.optionsVolumeZ) : 0;

    const prompt = `Ticker: ${b.symbol} (${b.name})
Options volume today: ${fmt(b.optionsVolumeToday, 0)}
Options volume 30-day average: ${fmt(b.optionsVolumeAvg30, 0)}${b.historyDays < 5 ? " (insufficient history: only " + b.historyDays + " prior day(s) recorded)" : ""}
Options volume z-score vs own history: ${fmt(b.optionsVolumeZ)}
Call/put ratio today: ${fmt(b.callPutRatioToday)}
Call/put ratio 30-day average: ${fmt(b.callPutRatioAvg30)}
Price volume vs its own 30-day average (ratio): ${fmt(b.volumeRatio)}
Price change today: ${fmt(b.priceChangePct)}%
Strikes with OI increase (new positions opened) today: ${JSON.stringify(b.oiOpenedStrikes)}
Strikes with OI decrease (positions closed) today: ${JSON.stringify(b.oiClosedStrikes)}
candidateFlag: ${b.candidateFlag}

Return the JSON object described in your instructions for this ticker only.`;

    try {
      const raw = await callLlmJson<Record<string, unknown>>({
        system: SYSTEM_PROMPT,
        prompt,
        maxTokens: 700,
      });
      const parsed = AnalysisSchema.parse(raw);
      out.push({
        symbol: b.symbol,
        volumeVsRange: sanitize(parsed.volumeVsRange),
        callPutRatioNote: sanitize(parsed.callPutRatioNote),
        openInterestNote: sanitize(parsed.openInterestNote),
        priceConfirmationNote: sanitize(parsed.priceConfirmationNote),
        scheduledEventNote: sanitize(parsed.scheduledEventNote),
        // Never trust the model's own flag over the deterministic gate — it only narrates.
        flagged: b.candidateFlag,
        uncertaintyNote: sanitize(parsed.uncertaintyNote),
        unusualnessScore,
      });
    } catch {
      out.push({
        symbol: b.symbol,
        volumeVsRange: `Options volume today ${fmt(b.optionsVolumeToday, 0)} vs 30-day average ${fmt(b.optionsVolumeAvg30, 0)}.`,
        callPutRatioNote: `Call/put ratio today ${fmt(b.callPutRatioToday)} vs 30-day average ${fmt(b.callPutRatioAvg30)}.`,
        openInterestNote:
          b.oiOpenedStrikes.length > 0
            ? `OI increased at ${b.oiOpenedStrikes.length} active strike(s).`
            : b.oiClosedStrikes.length > 0
              ? `OI decreased at ${b.oiClosedStrikes.length} active strike(s).`
              : "No OI change at active strikes.",
        priceConfirmationNote: `Price change today: ${fmt(b.priceChangePct)}%.`,
        scheduledEventNote: "No earnings/dividend/event calendar is available for this ticker.",
        flagged: b.candidateFlag,
        uncertaintyNote:
          "Analysis narrative unavailable (model call failed) — numbers above are computed directly, not model output. Cannot determine buying vs selling, opening vs closing for the counterparty, or directional vs hedge from this data.",
        unusualnessScore,
      });
    }
  }

  return out.sort((a, b) => b.unusualnessScore - a.unusualnessScore);
}
