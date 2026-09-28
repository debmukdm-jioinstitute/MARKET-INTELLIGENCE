"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AiSignals } from "@/components/scanner/ai-signals";

export default function AISignalsPage() {
  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      <PageHeader
        kicker="AI Signals"
        title="AI Signals & Market Predictions"
        subtitle="Walk-forward ensemble leans for primary NSE F&O indices (pick index and horizon), plus Nifty 500 BTST/STBT candidates — each with honest out-of-sample track record."
        trust={{ source: "Model output on NSE / Upstox data", note: "AI-generated and can be wrong. Not investment advice" }}
        />
      <AiSignals />
    </div>
  );
}
