import { AlgoBackendStatusBanner } from "@/components/ai-trader/backend-status-banner";
import { AlgoProviders } from "@/components/ai-trader/algo-providers";
import { PageHeader } from "@/components/layout/page-header";
import "@/components/ai-trader/algo-desk.css";

export default function AlgoDeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="algo-trader-desk -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <PageHeader
          kicker="Trade"
          title="NIFTY Algo Desk"
          subtitle="Full AI-trader stack in the portal: tick replay backtests, XGBoost + RL models, live scanner, paper/live execution, option chain charts, and Zerodha broker controls — powered by a self-hosted Flask API."
        />
        <AlgoBackendStatusBanner />
        <AlgoProviders>{children}</AlgoProviders>
      </div>
    </div>
  );
}
