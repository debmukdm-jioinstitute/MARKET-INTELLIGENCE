/**
 * English → Hindi translation — Helsinki-NLP/opus-mt-en-hi
 *
 * Used for the Daily Brief's EN/हिं toggle. Cached 24h since a given brief's English text is
 * static once generated.
 */

import { hfInfer } from "@/lib/hf/client";

const MODEL = "Helsinki-NLP/opus-mt-en-hi";
const TTL_MS = 24 * 60 * 60 * 1000;

interface TranslationResponse {
  translation_text: string;
}

/** Translate one string of English text to Hindi. */
export async function translateToHindi(text: string): Promise<string> {
  const clipped = text.slice(0, 900);
  const result = await hfInfer<string, TranslationResponse[]>(MODEL, clipped, {
    ttlMs: TTL_MS,
    cacheKey: `opus-mt-en-hi::${clipped}`,
  });
  return result?.[0]?.translation_text ?? clipped;
}

/** Translate several strings, in order, run concurrently. Any individual failure falls back to
 * the original English string rather than dropping the item. */
export async function translateManyToHindi(texts: string[]): Promise<string[]> {
  return Promise.all(
    texts.map((t) =>
      t.trim() ? translateToHindi(t).catch(() => t) : Promise.resolve(t),
    ),
  );
}
