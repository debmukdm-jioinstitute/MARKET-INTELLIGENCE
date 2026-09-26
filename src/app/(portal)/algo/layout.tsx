import { AlgoBackendStatusBanner } from "@/components/ai-trader/backend-status-banner";
import { AlgoDeskControls } from "@/components/ai-trader/algo-desk-controls";
import { AlgoProviders } from "@/components/ai-trader/algo-providers";
import { GroupTabs } from "@/components/layout/group-tabs";
import { PageHeader } from "@/components/layout/page-header";
import "@/components/ai-trader/algo-desk.css";

export default function AlgoDeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-page algo-trader-desk pb-10">
      <PageHeader
        kicker="Trade"
        title="NIFTY Algo Desk"
        subtitle="Research-grade F&O stack: live scanner, backtests, charts, and model status — same portal look as Markets and Portfolio."
      />
      <GroupTabs />
      <AlgoBackendStatusBanner />
      <AlgoProviders>
        <AlgoDeskControls />
        {children}
      </AlgoProviders>
    </div>
  );
}
