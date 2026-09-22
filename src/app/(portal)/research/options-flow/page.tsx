"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { FlagHistory } from "@/components/options-flow/flag-history";
import { OptionsFlowPanel } from "@/components/options-flow/options-flow-panel";

export default function OptionsFlowPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Research Desk"
        title="Options flow screener"
        subtitle="A three-agent attention-direction system: a data agent gathers price, volume, and options activity with a source and timestamp on every figure; an analysis agent describes the gap between options activity and price without calling it bullish or bearish; a flagging agent turns that into a research shortlist of at most 5 tickers. It is a screener, not a signal — unusual activity is a reason to go look at a company, not a reason to take a position."
      />

      <Panel
        title="Run the screener"
        subtitle="Search and pick from the full NSE F&O universe (~210 optionable stocks, synced weekly from Upstox's instrument master) — options data comes from Upstox's option chain, so it's limited to names with listed options."
      >
        <OptionsFlowPanel />
      </Panel>

      <Panel
        title="Flag log"
        subtitle="Every flag from every run is logged automatically. Check back after a few months to see your real hit rate, not the flags you remember working."
      >
        <FlagHistory />
      </Panel>
    </div>
  );
}
