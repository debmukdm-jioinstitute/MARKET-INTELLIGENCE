import { runAnalysisAgent } from "@/lib/options-flow/analysis-agent";
import { computeTickerBaseline } from "@/lib/options-flow/baseline";
import { gatherOptionsFlowRecord } from "@/lib/options-flow/data-agent";
import { runFlaggingAgent } from "@/lib/options-flow/flagging-agent";
import { getOptionsFlowHistory, logOptionsFlowFlag, saveOptionsFlowRecord } from "@/lib/options-flow/store";
import { OPTIONS_FLOW_DISCLAIMER, type OptionsFlowRunResult, type TickerBaseline } from "@/lib/options-flow/types";

/** Runs `fn` over `items` with at most `limit` in flight — the full F&O universe (~210 names) would take
 * minutes run one at a time, and easily blows past a serverless function's time limit. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Data Agent only, persisted — what the daily cron runs for the whole universe. */
export async function runDataAgentAndSave(symbols: string[]): Promise<{ symbol: string; ok: boolean; error?: string }[]> {
  return mapWithConcurrency(symbols, 10, async (symbol) => {
    try {
      const record = await gatherOptionsFlowRecord(symbol);
      await saveOptionsFlowRecord(record);
      return { symbol, ok: true };
    } catch (e) {
      return { symbol, ok: false, error: e instanceof Error ? e.message : "gather failed" };
    }
  });
}

/** Full three-agent pipeline for a user-triggered run: gather (or reuse today's snapshot), analyze, flag. */
export async function runOptionsFlowPipeline(symbols: string[]): Promise<OptionsFlowRunResult> {
  const today = new Date().toISOString().slice(0, 10);

  const gathered = await mapWithConcurrency(symbols, 6, async (symbol) => {
    const record = await gatherOptionsFlowRecord(symbol, today);
    await saveOptionsFlowRecord(record);
    const history = await getOptionsFlowHistory(symbol, today, 30);
    return { record, baseline: computeTickerBaseline(record, history) };
  });

  const records = gathered.map((g) => g.record);
  const baselines: TickerBaseline[] = gathered.map((g) => g.baseline);
  const baselineMap = new Map(gathered.map((g) => [g.baseline.symbol, g.baseline]));

  const analysis = await runAnalysisAgent(baselines);
  const flagging = await runFlaggingAgent(analysis, baselineMap);

  for (const candidate of flagging.candidates) {
    const record = records.find((r) => r.symbol === candidate.symbol);
    const price = record?.price.status === "ok" ? record.price.value : null;
    await logOptionsFlowFlag({
      date: today,
      symbol: candidate.symbol,
      headline: candidate.whatIsUnusual,
      confidence: candidate.confidence,
      priceAtFlag: price,
    }).catch(() => {});
  }

  return {
    asOf: new Date().toISOString(),
    records,
    analysis,
    flagging,
    disclaimer: OPTIONS_FLOW_DISCLAIMER,
  };
}
