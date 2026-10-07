import { BUSINESS_LINES, linesFor, type BusinessLine } from "./business-lines";
import { inferLines } from "./line-infer";
import type { StockProfile } from "./profile";
import { hfEnabled, semanticLines } from "./semantic";

const BY_ID = new Map(BUSINESS_LINES.map((l) => [l.id, l]));

export type Resolved = { lines: BusinessLine[]; how: "rules" | "text" | "semantic" | "generic" };

/**
 * Every stock gets business-specific drivers:
 *  1. curated override / company-name rule / NSE industry (instant)
 *  2. text inference over name + Yahoo industry + public description (BM25, local)
 *  3. optional Hugging Face MiniLM nearest line (only if HF_TOKEN is set)
 *  4. generic market drivers (last resort)
 * `about` is lazy: it is only fetched when steps 1 does not place the stock.
 */
export async function resolveLines(symbol: string, name: string, industry: string | null, about?: () => Promise<string | null>, profile?: () => Promise<StockProfile | null>): Promise<Resolved> {
  const base = linesFor(symbol, name, industry);
  if (base[0]!.id !== "broad-market") return { lines: base, how: "rules" };

  const [prof, desc] = await Promise.all([profile?.().catch(() => null) ?? null, about?.().catch(() => null) ?? ""]);
  const profText = `${prof?.industry ?? ""} ${prof?.sector ?? ""}`.trim();
  const text = `${name} ${industry ?? ""} ${profText} ${profText} ${desc ?? ""}`;
  // Name alone is a weak signal, so it must clear a higher bar than name + industry/description.
  const guess = inferLines(text, profText || desc ? 2 : 1, profText || desc ? 2.2 : 3.4);
  if (guess.length) return { lines: guess.map((g) => BY_ID.get(g.id)!).filter(Boolean), how: "text" };

  if (hfEnabled()) {
    const id = await semanticLines(text);
    const line = id ? BY_ID.get(id) : null;
    if (line) return { lines: [line], how: "semantic" };
  }
  return { lines: base, how: "generic" };
}
