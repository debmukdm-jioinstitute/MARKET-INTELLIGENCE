"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AiSignals } from "@/components/scanner/ai-signals";

export default function AISignalsPage() {
  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      <PageHeader
        kicker="AI Signals"
        title="AI Signals & Market Predictions"
        subtitle="A Lorentzian nearest-neighbour model for the Nifty 50's next-session direction and for Nifty 500 BTST/STBT candidates — shown together with its walk-forward track record, so you can see how much weight it deserves."
      />
      <AiSignals />
    </div>
  );
}
