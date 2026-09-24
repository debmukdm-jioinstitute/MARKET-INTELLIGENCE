"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AISignalsDashboard } from "@/components/pkscreener/ai-signals-dashboard";

export default function AISignalsPage() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        title="AI Signals & Market Predictions"
        subtitle="ML-powered Nifty 50 next-day predictions, BTST/STBT trade setups, and 5-day trend forecasts from Market Intelligence models."
      />
      <AISignalsDashboard />
    </div>
  );
}
