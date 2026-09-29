"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ShieldCheck, TrendingUp, Layers, GitCompare, Database } from "lucide-react";

export type FundTab = "accumulation" | "xray" | "overlap" | "sources";

export function FundSubnav({
  activeTab,
  onTabChange,
  selectedFundId,
}: {
  activeTab: FundTab;
  onTabChange?: (tab: FundTab) => void;
  selectedFundId?: string;
}) {
  const tabs = [
    {
      id: "accumulation" as FundTab,
      label: "Institutional Accumulation",
      badge: "India MF Radar",
      icon: TrendingUp,
      description: "Which stocks are being accumulated across India's mutual funds",
    },
    {
      id: "xray" as FundTab,
      label: "Mutual Fund X-Ray",
      icon: Layers,
      description: "Holdings, Sector & Factor exposures, Concentration, and Manager behavior",
    },
    {
      id: "overlap" as FundTab,
      label: "Fund Overlap Analyzer",
      icon: GitCompare,
      description: "Portfolio overlap % and duplicate risk between 2 funds",
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
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
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
                {tab.badge && (
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">SEBI Mandated Disclosures:</span>
          <span className="font-semibold text-foreground">September 2026 Disclosures</span>
        </div>
      </div>
    </div>
  );
}
