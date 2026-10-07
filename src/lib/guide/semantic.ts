import { cosineSimilarity } from "@/lib/hf/embeddings";
import { hfInfer } from "@/lib/hf/client";
import { BUSINESS_LINES } from "./business-lines";

/**
 * OPTIONAL semantic layer (sentence-transformers/all-MiniLM-L6-v2 on Hugging Face). Only runs when
 * HF_TOKEN is set (Hugging Face no longer serves anonymous inference). Everything here degrades to
 * "no opinion" (null) on any failure, and the local rules carry on unchanged.
 *
 *  - semanticLines: for stocks the rules cannot place, nearest business line by embedding.
 *  - semanticRelevance: score a headline against a driver, used to drop keyword false-positives.
 */

const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
export type Embedder = (texts: string[]) => Promise<number[][] | null>;

export const hfEnabled = () => !!process.env.HF_TOKEN;

export const hfEmbedder: Embedder = async (texts) => {
  if (!hfEnabled()) return null;
  try {
    const out = await Promise.race([
      hfInfer<string[], number[][]>(MODEL, texts.map((t) => t.slice(0, 400)), { ttlMs: 24 * 3600_000, maxRetries: 1 }),
      new Promise<null>((r) => setTimeout(() => r(null), 4_000)),
    ]);
    return Array.isArray(out) && out.length === texts.length && Array.isArray(out[0]) ? (out as number[][]) : null;
  } catch {
    return null;
  }
};

let lineVecs: Promise<number[][] | null> | null = null;
const lineDocs = BUSINESS_LINES.map((l) => `${l.label}. ${l.drivers.map((d) => d.label).join("; ")}`);

export async function semanticLines(text: string, embed: Embedder = hfEmbedder, minSim = 0.32): Promise<string | null> {
  lineVecs ??= embed(lineDocs).then((v) => {
    if (!v) lineVecs = null; // retry next time
    return v;
  });
  const [lv, qv] = await Promise.all([lineVecs, embed([text])]);
  if (!lv || !qv?.[0]) return null;
  let best = -1;
  let bestSim = 0;
  lv.forEach((v, i) => {
    const s = cosineSimilarity(v, qv[0]!);
    if (s > bestSim) {
      bestSim = s;
      best = i;
    }
  });
  return best >= 0 && bestSim >= minSim ? BUSINESS_LINES[best]!.id : null;
}

/** Cosine similarity of each headline to the driver text, or null when the model is unavailable. */
export async function semanticRelevance(driverText: string, headlines: string[], embed: Embedder = hfEmbedder): Promise<number[] | null> {
  if (!headlines.length) return [];
  const v = await embed([driverText, ...headlines]);
  if (!v) return null;
  return headlines.map((_, i) => cosineSimilarity(v[0]!, v[i + 1]!));
}
