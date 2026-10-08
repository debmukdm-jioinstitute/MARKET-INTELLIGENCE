"use client";

import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { PortfolioDashboardView } from "@/components/my-portfolio/portfolio-dashboard-view";

export default function PortfolioPage() {
  const {
    data,
    locked,
    addHolding,
    removeHolding,
    clearHoldings,
    importHoldings,
    updateBenchmark,
    editHolding,
    sellHolding,
    updatePortfolioName,
    updateCashInr,
  } = useMyPortfolio();

  return (
    <PortfolioDashboardView
      data={data}
      locked={locked}
      onAddHolding={addHolding}
      onRemoveHolding={removeHolding}
      onClearHoldings={clearHoldings}
      onImportHoldings={importHoldings}
      onUpdateBenchmark={updateBenchmark}
      onEditHolding={editHolding}
      onSellHolding={sellHolding}
      onUpdateName={updatePortfolioName}
      onUpdateCash={updateCashInr}
    />
  );
}
