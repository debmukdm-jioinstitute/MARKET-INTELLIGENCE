"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { FlagHistory } from "@/components/options-flow/flag-history";
import { OptionsFlowPanel } from "@/components/options-flow/options-flow-panel";
import { Playbook } from "@/components/options-flow/playbook";
import { ProgressStrip } from "@/components/options-flow/progress-strip";
import { FreeTierAiQuotaBanner } from "@/components/payments/free-tier-ai-quota-banner";

export default function OptionsFlowPage() {
  return (
    <div className="portal-page">
      <PageHeader

        title="Options flow screener"
        subtitle="A three-agent attention-direction system: a data agent gathers price, volume, and options activity with a source and timestamp on every figure; an analysis agent describes the gap between options activity and price without calling it bullish or bearish; a flagging agent turns that into a research shortlist of at most 5 tickers. It is a screener, not a signal — unusual activity is a reason to go look at a company, not a reason to take a position."
      />

      <FreeTierAiQuotaBanner context="options-flow" />

      <ProgressStrip />

      <Panel
        title="Run the screener"
        subtitle="Search and pick from the full NSE F&O universe (~210 optionable stocks, synced weekly from Upstox's instrument master) — options data comes from Upstox's option chain, so it's limited to names with listed options."
      >
        <OptionsFlowPanel />
      </Panel>

      <Panel
        title="Flag log — your real hit rate"
        subtitle="Every flag from every run is logged automatically. Flags over time, the confidence mix, and every flag's story — the ones that led somewhere and the ones that didn't, so your memory can't cherry-pick."
      >
        <FlagHistory />
      </Panel>

      <Panel
        title="Beginner's playbook"
        subtitle="New to options flow? Four short reads on what unusual activity means and how to use this page."
      >
        <Playbook />
      </Panel>
    </div>
  );
}
