import { runAnalysisAgent } from "@/lib/options-flow/analysis-agent";
import { computeTickerBaseline } from "@/lib/options-flow/baseline";
import { gatherOptionsFlowRecord } from "@/lib/options-flow/data-agent";
import { runFlaggingAgent } from "@/lib/options-flow/flagging-agent";
import { getOptionsFlowHistory, logOptionsFlowFlag, saveOptionsFlowRecord } from "@/lib/options-flow/store";
import { OPTIONS_FLOW_DISCLAIMER, type OptionsFlowRunResult, type TickerBaseline } from "@/lib/options-flow/types";

/** Data Agent only, persisted — what the daily cron runs for the whole universe. */
export async function runDataAgentAndSave(symbols: string[]): Promise<{ symbol: string; ok: boolean; error?: string }[]> {
  const results = [];
  for (const symbol of symbols) {
    try {
      const record = await gatherOptionsFlowRecord(symbol);
      await saveOptionsFlowRecord(record);
      results.push({ symbol, ok: true });
    } catch (e) {
      results.push({ symbol, ok: false, error: e instanceof Error ? e.message : "gather failed" });
    }
  }
  return results;
}

/** Full three-agent pipeline for a user-triggered run: gather (or reuse today's snapshot), analyze, flag. */
export async function runOptionsFlowPipeline(symbols: string[]): Promise<OptionsFlowRunResult> {
  const today = new Date().toISOString().slice(0, 10);

  const records = [];
  const baselines: TickerBaseline[] = [];
  const baselineMap = new Map<string, TickerBaseline>();

  for (const symbol of symbols) {
    const record = await gatherOptionsFlowRecord(symbol, today);
    await saveOptionsFlowRecord(record);
    const history = await getOptionsFlowHistory(symbol, today, 30);
    const baseline = computeTickerBaseline(record, history);
    records.push(record);
    baselines.push(baseline);
    baselineMap.set(symbol, baseline);
  }

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
