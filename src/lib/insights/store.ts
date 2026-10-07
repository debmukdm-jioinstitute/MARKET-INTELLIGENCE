import { hasDatabase, sql } from "@/lib/db";
import type { InsightCard } from "@/lib/insights/engine";

let ready: Promise<void> | null = null;

export function ensureInsightSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  if (!ready) {
    ready = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS insight_cards (
          symbol text PRIMARY KEY,
          cards jsonb NOT NULL,
          generated_at timestamptz NOT NULL DEFAULT now()
        )`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function saveInsightCards(symbol: string, cards: InsightCard[]): Promise<void> {
  if (!hasDatabase()) return;
  await ensureInsightSchema();
  await sql()`
    INSERT INTO insight_cards (symbol, cards, generated_at)
    VALUES (${symbol}, ${JSON.stringify(cards)}::jsonb, now())
    ON CONFLICT (symbol) DO UPDATE SET cards = EXCLUDED.cards, generated_at = now()`;
}

export async function readInsightCards(symbols: string[]): Promise<InsightCard[]> {
  if (!hasDatabase() || symbols.length === 0) return [];
  await ensureInsightSchema();
  const rows = (await sql()`
    SELECT cards FROM insight_cards WHERE symbol = ANY(${symbols}::text[]) AND generated_at > now() - interval '3 days'`) as {
    cards: InsightCard[];
  }[];
  return rows.flatMap((r) => r.cards);
}
