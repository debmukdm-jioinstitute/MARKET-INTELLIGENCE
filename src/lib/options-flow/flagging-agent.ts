import { callLlmJson } from "@/lib/ai/llm";
import type { AnalysisOutput, FlagCandidate, FlaggingResult, TickerBaseline } from "@/lib/options-flow/types";
import { z } from "zod";

/**
 * The Flagging Agent. Per the doc: produces a research shortlist, never
 * recommends entries/exits/sizes/trades, gives at most 5 tickers, names the
 * most likely boring explanation for each, states a confidence level (says
 * low when it's low), says so in one line if nothing is genuinely unusual
 * rather than forcing 5 flags, and ends with the single question to research first.
 */

const SYSTEM_PROMPT = `You are a flagging agent. You produce a research shortlist from pre-analyzed options activity. You never recommend entries, exits, position sizes, or trades.

You will be given up to several candidate tickers that already passed a deterministic "unusual activity" gate (unusual options volume relative to the ticker's own history, with open interest confirming new positions opened, and price not moving correspondingly).

Give at most 5 tickers worth looking into today, chosen from the candidates given — do not invent tickers not in the list. For each:
- whatIsUnusual: what specifically is unusual, with the numbers you were given.
- openInterestConfirmsOpened: boolean, true only if open interest actually increased at the active strikes (you're told this).
- boringExplanation: the most likely mundane explanation — an index rebalance, a known hedge, sector-wide movement, or (if given) an earnings date or dividend/bonus/split/rights ex-date. You're given each candidate's upcomingEvent, drawn from two real feeds (earnings from Yahoo Finance, corporate actions from Upstox) — if either shows a date within the window, cite it as the boring explanation, stated as a hypothesis to check, not a confirmed cause. Otherwise, if you have no basis to guess one, say "no obvious mundane explanation identified from this data."
- whatToFindOut: what the user would need to find out to know whether this matters.
- confidence: "low", "medium", or "high" — say low when it is low. Most of these should be low or medium, since this data alone cannot confirm intent.

If none of the candidates are genuinely worth flagging, return an empty candidates array and fill nothingUnusualNote with one plain sentence saying so — do not pad the list to reach 5.

Always end by filling researchQuestion with the single question the user should research first, or null if candidates is empty.

Never use bullish, bearish, buy, sell, rally, tank, surge, plunge, upside, or downside.`;

const CandidateSchema = z.object({
  symbol: z.string(),
  whatIsUnusual: z.string().min(1).max(500),
  openInterestConfirmsOpened: z.boolean(),
  boringExplanation: z.string().min(1).max(300),
  whatToFindOut: z.string().min(1).max(300),
  confidence: z.enum(["low", "medium", "high"]),
});

const FlaggingSchema = z.object({
  candidates: z.array(CandidateSchema).max(8),
  nothingUnusualNote: z.string().max(300).nullable(),
  researchQuestion: z.string().max(300).nullable(),
});

const BANNED_WORDS = /\b(bullish|bearish|buy|sell|rally|tank|surge|plunge|upside|downside)\b/i;

function stripBanned(text: string): string {
  return BANNED_WORDS.test(text) ? "Explanation withheld — model output used disallowed directional language." : text;
}

export async function runFlaggingAgent(
  analysis: AnalysisOutput[],
  baselines: Map<string, TickerBaseline>,
): Promise<FlaggingResult> {
  const flaggedAnalysis = analysis.filter((a) => a.flagged);

  if (flaggedAnalysis.length === 0) {
    return {
      candidates: [],
      nothingUnusualNote: "No ticker in this run showed unusual options volume that opened new positions without a corresponding price move — nothing genuinely unusual to flag today.",
      researchQuestion: null,
    };
  }

  const candidateInput = flaggedAnalysis.map((a) => {
    const b = baselines.get(a.symbol);
    return {
      symbol: a.symbol,
      optionsVolumeZ: b?.optionsVolumeZ ?? null,
      optionsVolumeToday: b?.optionsVolumeToday ?? null,
      optionsVolumeAvg30: b?.optionsVolumeAvg30 ?? null,
      oiOpenedStrikes: b?.oiOpenedStrikes ?? [],
      priceChangePct: b?.priceChangePct ?? null,
      openInterestNote: a.openInterestNote,
      volumeVsRange: a.volumeVsRange,
      upcomingEvent: b?.upcomingEventNote ?? "unavailable",
    };
  });

  const prompt = `Candidates (already gated as unusual, max 8 given, you choose at most 5):\n${JSON.stringify(candidateInput, null, 2)}\n\nReturn the JSON object described in your instructions.`;

  try {
    const raw = await callLlmJson<Record<string, unknown>>({ system: SYSTEM_PROMPT, prompt, maxTokens: 1200 });
    const parsed = FlaggingSchema.parse(raw);
    const validSymbols = new Set(flaggedAnalysis.map((a) => a.symbol));
    const candidates: FlagCandidate[] = parsed.candidates
      .filter((c) => validSymbols.has(c.symbol))
      .slice(0, 5)
      .map((c) => ({
        symbol: c.symbol,
        whatIsUnusual: stripBanned(c.whatIsUnusual),
        openInterestConfirmsOpened: c.openInterestConfirmsOpened,
        boringExplanation: stripBanned(c.boringExplanation),
        whatToFindOut: stripBanned(c.whatToFindOut),
        confidence: c.confidence,
      }));

    return {
      candidates,
      nothingUnusualNote: candidates.length === 0 ? (parsed.nothingUnusualNote ?? "Nothing genuinely unusual to flag today.") : null,
      researchQuestion: candidates.length > 0 ? parsed.researchQuestion : null,
    };
  } catch {
    // Deterministic fallback: still honest, just without the LLM's prose.
    const candidates: FlagCandidate[] = flaggedAnalysis.slice(0, 5).map((a) => {
      const b = baselines.get(a.symbol);
      return {
        symbol: a.symbol,
        whatIsUnusual: `Options volume z-score ${b?.optionsVolumeZ?.toFixed(2) ?? "unavailable"} vs own history; OI increased at ${b?.oiOpenedStrikes.length ?? 0} strike(s).`,
        openInterestConfirmsOpened: (b?.oiOpenedStrikes.length ?? 0) > 0,
        boringExplanation:
          b?.upcomingEventNote ?? "Flagging narrative unavailable (model call failed) — no mundane-explanation hypothesis generated.",
        whatToFindOut: "Check the earnings calendar, dividend calendar, and recent news for this ticker manually.",
        confidence: "low",
      };
    });
    return {
      candidates,
      nothingUnusualNote: null,
      researchQuestion: "Which of these flagged tickers has a scheduled event (earnings, dividend, index rebalance) in the next 30 days that would explain the activity?",
    };
  }
}
