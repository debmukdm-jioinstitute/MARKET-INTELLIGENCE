"use client";

import { PageHeader } from "@/components/layout/page-header";
import type { ReactNode } from "react";

/** Portal-aligned shell for World Monitor (Google Sans, light card layout). */
export function WorldMonitorPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 px-1 sm:space-y-6 sm:px-0">
      <PageHeader
        kicker="Global intelligence"
        title="World Monitor"
        subtitle="Wars, sanctions, protests, and shipping — mapped and linked to market impact. India portfolio tools stay in the main menu."
        titleAs="h1"
      />
      {children}
    </div>
  );
}
