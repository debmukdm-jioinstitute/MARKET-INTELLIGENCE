"use client";

import { Layers, Database } from "lucide-react";

export type FundTab = "directory" | "sources";

export function FundSubnav({
  activeTab,
  onTabChange,
}: {
  activeTab: FundTab;
  onTabChange?: (tab: FundTab) => void;
  selectedFundId?: string;
}) {
  const tabs = [
    {
      id: "directory" as FundTab,
      label: "Fund Directory",
      icon: Layers,
      description: "Scheme registry with live AMFI NAVs",
    },
    {
      id: "sources" as FundTab,
      label: "AMC & AMFI Disclosures",
      icon: Database,
      description: "AMFI NAVs, Factsheets, and SEBI monthly portfolio disclosures",
    },
  ];

  return (
    <div className="border-b border-border/60 bg-card/40 backdrop-blur-md px-4 sm:px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-3 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
