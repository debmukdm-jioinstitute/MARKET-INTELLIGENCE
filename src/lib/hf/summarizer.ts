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

  const cacheKey = `bart-cnn::${clipped.slice(0, 200)}::${maxWords}`;

  // The hf-inference provider's currently-deployed facebook/bart-large-cnn endpoint rejects any
  // `parameters` object at all for this task ("model_kwargs are not used by the model: ['parameters']"),
  // including the documented parameters.generate_parameters shape — tried and confirmed live. Bare
  // `inputs` is the only request shape that works, so maxWords is enforced by truncating the
  // model's own (untargeted) output below rather than by a generation parameter.
  const result = await hfInfer<{ inputs: string }, BartSummarizationResponse[]>(
    MODEL,
    { inputs: clipped },
    { ttlMs: TTL_MS, cacheKey },
  );

  const summary = result?.[0]?.summary_text ?? clipped.slice(0, 300);
  const words = summary.trim().split(/\s+/);
  return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}…` : summary;
}

/**
 * Summarize multiple text items into one consolidated TL;DR.
 * Joins them with newlines so BART sees them as a single document.
 */
export async function summarizeItems(items: string[], maxWords = 80): Promise<string> {
  const combined = items.join("\n").trim();
  if (!combined) return "";
  return summarizeText(combined, maxWords);
}
