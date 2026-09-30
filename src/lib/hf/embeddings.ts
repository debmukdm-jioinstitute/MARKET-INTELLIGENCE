/**
 * Text embedding similarity using sentence-transformers/all-MiniLM-L6-v2
 *
 * Use-cases:
 *  1. "Stocks similar to this one" — embed company descriptions and find nearest neighbors
 *  2. Research query expansion — embed a query and find semantically relevant topics
 *  3. News deduplication — cluster similar headlines
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2 (Apache-2.0, 22M params, 384-dim embeddings)
 * HF free tier: easily handles this via feature-extraction pipeline.
 * Cache: 24h (embeddings are stable for the same text).
 */

import { hfInfer } from "@/lib/hf/client";

const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — embeddings are deterministic

/** Raw HF feature-extraction response: float32[][] */
type EmbeddingResponse = number[][];

/**
 * Get embeddings for up to 10 text snippets.
 * Returns 384-dimensional float vectors.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const safe = texts.slice(0, 10).map((t) => t.slice(0, 512));

  try {
    const result = await hfInfer<string[], EmbeddingResponse>(MODEL, safe, {
      ttlMs: TTL_MS,
      cacheKey: `miniLM::${safe.join("|").slice(0, 200)}`,
    });

    return result;
  } catch (err) {
    console.warn("[MiniLM Embeddings] API unavailable, using hash fallback:", err instanceof Error ? err.message : err);
    return safe.map((text) => fallbackEmbedding(text));
  }
}

function fallbackEmbedding(text: string): number[] {
  const vec = new Array(384).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    for (let j = 0; j < w.length; j++) {
      const charCode = w.charCodeAt(j);
      const idx = (charCode * 31 + i * 17 + j) % 384;
      vec[idx] = (vec[idx] || 0) + (charCode / 255.0);
    }
  }
  // Normalize vector
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vec.map((v) => v / norm);
}

/** Cosine similarity between two equal-length vectors (returns -1..1) */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Given a query text and a list of candidates (with labels), return top-N
 * most semantically similar candidates ranked by cosine similarity.
 */
export async function findSimilar(
  query: string,
  candidates: { text: string; label: string }[],
  topN = 5,
): Promise<{ label: string; text: string; similarity: number }[]> {
  if (!candidates.length) return [];

  const allTexts = [query, ...candidates.map((c) => c.text)];
  const embeddings = await embedTexts(allTexts);

  const queryEmb = embeddings[0];
  if (!queryEmb) return [];

  const scored = candidates.map((c, i) => ({
    label: c.label,
    text: c.text,
    similarity: cosineSimilarity(queryEmb, embeddings[i + 1] ?? []),
  }));

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}
