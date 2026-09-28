"use client";

import { PageHeader } from "@/components/layout/page-header";
import type { ReactNode } from "react";

/** Portal-aligned shell for World Monitor (Google Sans, light card layout). */
export function WorldMonitorPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        kicker="Global intelligence"
        title="World Monitor"
        subtitle="Maps, geopolitical layers, country instability (CII), and cross-asset radar. India portfolio and macro tools stay in the main menu."
        titleAs="h1"
      />
      {children}
    </div>
  );
}
