"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AiSignals } from "@/components/scanner/ai-signals";

export default function AISignalsPage() {
  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      <PageHeader
        kicker="AI Signals"
        title="Short-term model test bench"
        subtitle="Public test of walk-forward models on NSE F&O indices and Nifty 500 buy-today-sell-tomorrow (BTST) / sell-today-buy-tomorrow (STBT) candidates — with out-of-sample stats shown honestly. Not a buy/sell feed."
        trust={{ source: "Model output on NSE / Upstox data", note: "AI-generated and can be wrong. Not investment advice" }}
      />
      <AiSignals />
    </div>
  );
}
