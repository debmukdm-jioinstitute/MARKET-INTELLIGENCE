"use client";

import { PageHeader } from "@/components/layout/page-header";
import { BacktestingDashboard } from "@/components/pkscreener/backtesting-dashboard";

export default function BacktestingPage() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="PKScreener Backtesting"
        title="Backtesting & Strategy Analysis"
        subtitle="Simulate ₹10,000 growing across PKScreener strategies, analyze morning-vs-close P&L patterns, and paper trade with ATR trailing stops."
      />
      <BacktestingDashboard />
    </div>
  );
}
