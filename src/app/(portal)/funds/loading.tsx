"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

export default function FundsLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <GlassLoader
        variant="page"
        message="Loading live NAVs from AMFI..."
        detail="Ingesting official AMFI daily NAV feeds, AMC factsheets & institutional disclosures"
        statusBadge="AMFI NAV CRAWLER ACTIVE"
        icon="chart"
      />
    </div>
  );
}
