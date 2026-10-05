"use client";

import { PageHeader } from "@/components/layout/page-header";
import { BacktestDashboard } from "@/components/scanner/backtest-dashboard";

export default function BacktestingPage() {
  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      <PageHeader

        title="Scanner Backtests"
        subtitle="How each Nifty 500 scanner's signals would have performed over the last two years — win rate, average return and edge over the average stock, with no look-ahead."
        trust={{ source: "NSE daily prices", delayed: "Refreshed after each NSE close", note: "Simulated, excludes costs; past results do not predict future returns" }}
        />
      <BacktestDashboard />
    </div>
  );
}
