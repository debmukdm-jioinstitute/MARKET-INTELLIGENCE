/**
 * Plain-English TL;DR summarizer — facebook/bart-large-cnn
 *
 * Takes a block of financial text (news snippets, research notes, earnings
 * commentary) and returns a 2–3 sentence summary that is easy to scan.
 *
 * Model: facebook/bart-large-cnn (abstractive summarization, Apache-2.0 weights).
 * HF free tier handles this well; cache for 60 min since the underlying text
 * doesn't change frequently.
 */

import { hfInfer } from "@/lib/hf/client";

const MODEL = "facebook/bart-large-cnn";
const TTL_MS = 60 * 60 * 1000; // 1 hour

interface BartSummarizationResponse {
  summary_text: string;
}

/**
 * Summarize one block of financial text into a short TL;DR.
 *
 * @param text      Raw text to summarize (news items, research snippets…)
 * @param maxWords  Approximate max words for the output summary (default 80)
 */
export async function summarizeText(text: string, maxWords = 80): Promise<string> {
  // BART works best with 100-1024 words; clip longer texts
  const clipped = text.split(/\s+/).slice(0, 900).join(" ");
  if (!clipped.trim()) return "";

  const cacheKey = `bart-cnn::${clipped.slice(0, 200)}::${maxWords}`;

  try {
    const result = await hfInfer<{ inputs: string }, BartSummarizationResponse[]>(
      MODEL,
      { inputs: clipped },
      { ttlMs: TTL_MS, cacheKey },
    );

    const summary = result?.[0]?.summary_text ?? clipped.slice(0, 300);
    const words = summary.trim().split(/\s+/);
    return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}…` : summary;
  } catch (err) {
    console.warn("[BART Summarizer] API unavailable, using extractive fallback:", err instanceof Error ? err.message : err);
  }

  // Fallback: Return first 2-3 key sentences up to maxWords
  const sentences = clipped.match(/[^.!?]+[.!?]+/g) || [clipped];
  let fallback = "";
  for (const s of sentences) {
    if ((fallback + s).split(/\s+/).length > maxWords) break;
    fallback += (fallback ? " " : "") + s.trim();
  }
  return fallback || clipped.split(/\s+/).slice(0, maxWords).join(" ") + "...";
}

/**
 * Summarize multiple text items into one consolidated TL;DR.
 * Joins them with newlines so BART sees them as a single document.
 */
export async function summarizeItems(items: string[], maxWords = 80): Promise<string> {
  const combined = items.filter(Boolean).join("\n").trim();
  if (!combined) return "";
  return summarizeText(combined, maxWords);
}
